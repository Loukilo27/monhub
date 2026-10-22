// Assistant IA (Google Gemini). La clé API reste ici (secret GEMINI_API_KEY) ; seul le
// propriétaire (jeton aal2) peut l'appeler.
//
// Déroulé : l'app envoie un message (ou les résultats d'outils qu'elle a exécutés). Le modèle
// répond par du texte, ou demande des outils :
// - outils du serveur (recherche web, météo) : exécutés ici, gratuitement et sans clé ;
// - outils de l'app (agenda, tâches, alarmes…) : renvoyés à l'app, qui les exécute (après
//   confirmation pour les créations / suppressions) puis rappelle la fonction avec les résultats.
// La recherche Google intégrée à Gemini n'est pas incluse dans l'offre gratuite : voir _shared/webTools.ts.
import { adminClient, corsHeaders, env, json, requireOwner, safeEqual } from '../_shared/admin.ts'
import {
  normalizeArgs,
  responseText,
  systemInstruction,
  toGeminiSchema,
  trimContents,
  type GeminiContent,
  type GeminiPart,
} from '../_shared/assistant.ts'
import { searchWeb, weather, type Source } from '../_shared/webTools.ts'

type Json = Record<string, unknown>
type Admin = ReturnType<typeof adminClient>

const API = 'https://generativelanguage.googleapis.com/v1beta/models'
/**
 * Modèles gratuits, du meilleur au plus léger. Chacun a son propre quota quotidien (20 requêtes
 * seulement pour gemini-3.8-flash) : quand l'un est épuisé, on passe au suivant.
 */
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.8-flash,gemini-3.6-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)
const MODEL = MODELS[0]
/** Signature factice documentée par Google, pour un historique produit par un autre modèle. */
const SKIP_SIGNATURE = 'skip_thought_signature_validator'
const MAX_ROUNDS = 6
const THINKING_LEVEL = Deno.env.get('GEMINI_THINKING_LEVEL') ?? 'low'

class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function replaceSignatures(contents: GeminiContent[]): GeminiContent[] {
  return contents.map((content) => ({
    ...content,
    parts: content.parts.map((part) => (part.thoughtSignature ? { ...part, thoughtSignature: SKIP_SIGNATURE } : part)),
  }))
}

/**
 * Conversation : essaie les modèles dans l'ordre tant que le quota (429) est épuisé.
 * Les signatures de raisonnement d'un autre modèle sont remplacées par la signature factice.
 */
async function generateWithFallback(body: Json & { contents: GeminiContent[] }): Promise<{ parts: GeminiPart[]; model: string }> {
  let lastError: unknown
  for (const [index, model] of MODELS.entries()) {
    try {
      const contents = index === 0 ? body.contents : replaceSignatures(body.contents)
      return { parts: await generate(model, { ...body, contents }), model }
    } catch (error) {
      lastError = error
      if (!(error instanceof GeminiError) || (error.status !== 429 && error.status !== 404)) throw error
    }
  }
  throw lastError
}

/** Appel à Gemini, avec deux nouvelles tentatives si le modèle est momentanément surchargé. */
async function generate(model: string, body: Json): Promise<GeminiPart[]> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
      body: JSON.stringify(body),
    })
    const raw = (await response.json().catch(() => ({}))) as Json
    if (response.ok) {
      const candidate = (raw.candidates as { content?: { parts?: GeminiPart[] } }[] | undefined)?.[0]
      return candidate?.content?.parts ?? []
    }
    if ((response.status === 503 || response.status === 500) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)))
      continue
    }
    throw new GeminiError(response.status, (raw.error as { message?: string } | undefined)?.message ?? `Erreur Gemini ${response.status}`)
  }
}

const SERVER_TOOLS = [
  {
    name: 'recherche_web',
    description:
      'Recherche d’informations récentes : dernières actualités (Google News) et résumés Wikipédia. À utiliser pour l’actualité, les faits, les personnes, les lieux.',
    parameters: { type: 'object', properties: { question: { type: 'string', description: 'Mots-clés de recherche, en français' } }, required: ['question'] },
  },
  {
    name: 'meteo',
    description: 'Météo actuelle et prévisions sur 4 jours pour une ville.',
    parameters: { type: 'object', properties: { lieu: { type: 'string', description: 'Ville, ex. « Paris » ou « Lyon »' } }, required: ['lieu'] },
  },
]

async function runServerTool(name: string, args: Json, timeZone: string): Promise<{ response: Json; sources: Source[] }> {
  try {
    const result = name === 'meteo' ? await weather(String(args.lieu ?? 'Paris'), timeZone) : await searchWeb(String(args.question ?? ''))
    return { response: result.resultats, sources: result.sources }
  } catch (error) {
    return { response: { erreur: `Service indisponible (${(error as Error).message}).` }, sources: [] }
  }
}

async function addMessage(admin: Admin, userId: string, conversationId: string, role: 'user' | 'assistant' | 'action', text: string, sources: Source[] = []) {
  await admin.from('ai_messages').insert({ user_id: userId, conversation_id: conversationId, role, text, sources })
}

function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof GeminiError) {
    if (error.status === 429) {
      return json(request, { error: 'quota', message: 'Quota gratuit de Gemini atteint pour le moment. Réessaie dans quelques minutes (ou demain si c’est la limite quotidienne).' }, 429)
    }
    if (error.status === 503) return json(request, { error: 'busy', message: 'Gemini est très sollicité en ce moment. Réessaie dans un instant.' }, 503)
    if (error.status === 400 && /API key/i.test(error.message)) return json(request, { error: 'invalid_key', message: 'Clé API Gemini invalide.' }, 500)
    if (error.status === 403) return json(request, { error: 'forbidden', message: 'Accès à Gemini refusé pour cette clé.' }, 502)
    return json(request, { error: 'gemini', message: `Gemini : ${error.message}` }, 502)
  }
  return json(request, { error: 'internal', message: (error as Error).message }, 500)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Méthode non autorisée' }, 405)

  const admin = adminClient()
  const cronSecret = request.headers.get('x-cron-secret')
  const fromServer = cronSecret !== null && safeEqual(cronSecret, env('CRON_SECRET'))
  const owner = await requireOwner(request, admin)
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    models?: string[]
    conversationId?: string
    message?: string
    toolResults?: { id?: string; name: string; response: Json; summary?: string }[]
    tools?: Json[]
  }

  // Diagnostic : le modèle répond-il avec cette clé ?
  if (body.action === 'health' && (owner || fromServer)) {
    const results: Json = {}
    for (const model of body.models ?? [MODEL]) {
      try {
        results[model] = { ok: true, text: responseText(await generate(model, { contents: [{ role: 'user', parts: [{ text: 'Réponds juste « ok ».' }] }] })) }
      } catch (error) {
        results[model] = { ok: false, status: (error as GeminiError).status, message: (error as Error).message }
      }
    }
    return json(request, results)
  }
  // Propriétaire connecté avec la 2FA, ou serveur (secret interne : tests, tâches planifiées).
  if (!owner && !fromServer) return json(request, { error: 'Accès refusé' }, 401)

  const userId = env('OWNER_USER_ID')
  const { data: settings } = await admin.from('settings').select('time_zone').eq('user_id', userId).maybeSingle()
  const timeZone = settings?.time_zone ?? 'Europe/Paris'
  const now = new Date()

  try {
    // Conversation existante ou nouvelle.
    let conversation: { id: string; contents: GeminiContent[]; pending_results: GeminiPart[] }
    if (body.conversationId) {
      const { data } = await admin
        .from('ai_conversations')
        .select('id, contents, pending_results')
        .eq('id', body.conversationId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!data) return json(request, { error: 'not_found', message: 'Conversation introuvable.' }, 404)
      conversation = data
    } else {
      const title = (body.message ?? 'Nouvelle conversation').replace(/\s+/g, ' ').trim().slice(0, 60)
      const { data, error } = await admin.from('ai_conversations').insert({ user_id: userId, title }).select('id, contents, pending_results').single()
      if (error || !data) throw new Error(error?.message ?? 'Création de la conversation impossible')
      conversation = data
    }
    let contents = conversation.contents ?? []

    if (body.message?.trim()) {
      contents.push({ role: 'user', parts: [{ text: body.message.trim() }] })
      await addMessage(admin, userId, conversation.id, 'user', body.message.trim())
    } else if (body.toolResults?.length) {
      // Une seule réponse groupée pour tous les appels du tour précédent (serveur + app).
      contents.push({
        role: 'user',
        parts: [
          ...(conversation.pending_results ?? []),
          ...body.toolResults.map((result) => ({ functionResponse: { ...(result.id ? { id: result.id } : {}), name: result.name, response: result.response } })),
        ],
      })
      for (const result of body.toolResults) if (result.summary) await addMessage(admin, userId, conversation.id, 'action', result.summary)
    } else {
      return json(request, { error: 'bad_request', message: 'Message vide.' }, 400)
    }

    const serverToolNames = new Set(SERVER_TOOLS.map((tool) => tool.name))
    const tools = [{ functionDeclarations: [...(body.tools ?? []), ...SERVER_TOOLS].map((tool) => ({ ...tool, parameters: toGeminiSchema(tool.parameters) })) }]
    const sources: Source[] = []

    for (let round = 0; round < MAX_ROUNDS; round++) {
      contents = trimContents(contents)
      const { parts, model } = await generateWithFallback({
        systemInstruction: { parts: [{ text: systemInstruction(now, timeZone) }] },
        contents,
        tools,
        // Réflexion légère : réponses bien plus rapides, suffisant pour un assistant du quotidien.
        generationConfig: { thinkingConfig: { thinkingLevel: THINKING_LEVEL } },
      })
      // Le tour du modèle est gardé tel quel (signatures de raisonnement comprises).
      contents.push({ role: 'model', parts: parts.length ? parts : [{ text: '' }] })
      const calls = parts.filter((part) => part.functionCall).map((part) => part.functionCall!)

      if (!calls.length) {
        const text = responseText(parts) || 'Je n’ai pas de réponse à proposer.'
        await addMessage(admin, userId, conversation.id, 'assistant', text, sources)
        await admin.from('ai_conversations').update({ contents, pending_results: [] }).eq('id', conversation.id)
        return json(request, { status: 'done', conversationId: conversation.id, text, sources, model })
      }

      const serverResults: GeminiPart[] = []
      for (const call of calls.filter((item) => serverToolNames.has(item.name))) {
        const result = await runServerTool(call.name, call.args ?? {}, timeZone)
        sources.push(...result.sources.filter((source) => !sources.some((other) => other.url === source.url)))
        serverResults.push({ functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: result.response } })
      }
      const clientCalls = calls.filter((item) => !serverToolNames.has(item.name))

      if (!clientCalls.length) {
        contents.push({ role: 'user', parts: serverResults })
        continue
      }

      // Outils de l'app : renvoyés avec les dates déjà résolues dans le fuseau de l'utilisateur.
      await admin.from('ai_conversations').update({ contents, pending_results: serverResults }).eq('id', conversation.id)
      return json(request, {
        status: 'tool_calls',
        conversationId: conversation.id,
        calls: clientCalls.map((call) => ({ id: call.id, name: call.name, args: normalizeArgs(call.name, call.args ?? {}, now, timeZone) })),
        sources,
        model,
      })
    }

    await admin.from('ai_conversations').update({ contents, pending_results: [] }).eq('id', conversation.id)
    return json(request, { status: 'done', conversationId: conversation.id, text: 'Je me suis un peu perdu : peux-tu reformuler ?', sources })
  } catch (error) {
    return errorResponse(request, error)
  }
})
