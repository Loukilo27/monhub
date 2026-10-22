// Assistant IA : consignes données à Gemini et normalisation des arguments d'outils.
// Code pur partagé, testé par Vitest (assistant.test.ts).

import { zonedParts, zonedToUtc } from './zonedTime.ts'

export interface GeminiPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> }
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

const WEEKDAYS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const pad = (value: number) => String(value).padStart(2, '0')

/** Consignes de l'assistant, avec la date et l'heure actuelles dans le fuseau de l'utilisateur. */
export function systemInstruction(now: Date, timeZone: string): string {
  const p = zonedParts(now, timeZone)
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  return [
    'Tu es l’assistant de MonHub, le tableau de bord personnel de l’utilisateur (calendrier, tâches, horloge, notes, musique, dessin).',
    'Réponds toujours en français, de façon brève, claire et chaleureuse. Tutoie l’utilisateur.',
    `Nous sommes le ${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]} ${p.year} (${today}), il est ${pad(p.hour)}:${pad(p.minute)}, fuseau ${timeZone}.`,
    'Calcule toi-même les dates relatives à partir de cette date : « demain », « mardi prochain » (le prochain mardi après aujourd’hui), « dans 3 jours »…',
    'Dans les outils, écris les dates « AAAA-MM-JJ », les heures « HH:MM » et les dates-heures locales « AAAA-MM-JJTHH:MM », dans ce fuseau.',
    'Pour une question sur l’agenda ou les tâches (« qu’est-ce que j’ai demain ? »), consulte d’abord les outils de lecture, puis résume.',
    'N’invente jamais d’identifiant : récupère-les avec les outils de liste avant de modifier, cocher ou supprimer.',
    'Pour l’actualité, la météo ou tout fait récent, utilise recherche_web.',
    'Les créations et suppressions sont confirmées par l’utilisateur dans l’interface : appelle directement l’outil sans lui demander de confirmer par écrit. Si une action est annulée, prends-en acte sans insister.',
    'Après une action réussie, confirme en une phrase ce qui a été fait (avec date et heure).',
  ].join('\n')
}

/** « AAAA-MM-JJTHH:MM » (heure locale) → instant ISO, ou null si le format est invalide. */
export function localDateTimeToIso(value: unknown, timeZone: string): string | null {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/) : null
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  return zonedToUtc(year, month, day, hour, minute, timeZone).toISOString()
}

/**
 * Résout côté serveur ce qui dépend de la date et du fuseau, avant de transmettre l'appel à l'app :
 * - dates-heures locales (debut, fin) → instants ISO (debut_iso, fin_iso) ;
 * - « dans N minutes » pour une alarme → heure locale exacte.
 */
export function normalizeArgs(name: string, args: Record<string, unknown>, now: Date, timeZone: string): Record<string, unknown> {
  const result = { ...args }
  for (const key of ['debut', 'fin']) {
    if (key in result && !result.journee_entiere) {
      const iso = localDateTimeToIso(result[key], timeZone)
      if (iso) result[`${key}_iso`] = iso
    }
  }
  if (name === 'creer_alarme' && typeof result.dans_minutes === 'number' && !result.heure) {
    const p = zonedParts(new Date(now.getTime() + Math.round(result.dans_minutes) * 60_000 + 30_000), timeZone)
    result.heure = `${pad(p.hour)}:${pad(p.minute)}`
  }
  return result
}

/** Les schémas d'outils de l'app sont écrits en JSON Schema minuscule ; l'API attend les types en majuscules. */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema)
  if (!schema || typeof schema !== 'object') return schema
  return Object.fromEntries(
    Object.entries(schema as Record<string, unknown>).map(([key, value]) => [
      key,
      key === 'type' && typeof value === 'string' ? value.toUpperCase() : toGeminiSchema(value),
    ]),
  )
}

/**
 * Garde les derniers échanges (limite de contexte et de quota) en coupant au début d'une
 * question de l'utilisateur, pour ne jamais séparer un appel d'outil de sa réponse.
 */
export function trimContents(contents: GeminiContent[], max = 40): GeminiContent[] {
  if (contents.length <= max) return contents
  for (let start = contents.length - max; start < contents.length; start++) {
    const content = contents[start]
    if (content.role === 'user' && content.parts.some((part) => part.text) && !content.parts.some((part) => part.functionResponse)) {
      return contents.slice(start)
    }
  }
  return contents.slice(-2)
}

/** Texte de réponse (sans les parties de raisonnement). */
export function responseText(parts: GeminiPart[]): string {
  return parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join('')
    .trim()
}
