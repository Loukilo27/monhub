import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAlarmActions } from '../apps/clock/alarms'
import { useTimerActions } from '../apps/clock/timers'
import { useEventActions } from '../apps/calendar/data'
import { useNoteActions } from '../apps/notes/data'
import { APPS } from '../apps/registry'
import { useTodoActions } from '../apps/todo/data'
import { backend } from '../data'
import { FunctionError } from '../data/backend'
import { useSettings, useTimeZone } from '../data/queries'
import { useSetTheme } from '../settings/settingsSync'
import { coreTools } from './coreTools'
import { speak } from './speech'
import type { AiContext, AiTool, ToolArgs } from './types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'action'
  text: string
  sources?: { title: string; url: string }[]
  created_at?: string
}

export interface PendingCall {
  id?: string
  name: string
  args: ToolArgs
  tool?: AiTool
  summary: string
}

interface AssistantResponse {
  status: 'done' | 'tool_calls'
  conversationId: string
  text?: string
  sources?: { title: string; url: string }[]
  calls?: { id?: string; name: string; args: ToolArgs }[]
}

interface Conversation {
  id: string
  title: string
  updated_at?: string
}

/** Toutes les actions déclarées dans le registre des mini-applis, plus la navigation et le thème. */
export const ALL_TOOLS: AiTool[] = [...APPS.flatMap((app) => app.aiActions), ...coreTools]
const DECLARATIONS = ALL_TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters }))

export function useAiContext(onNavigate?: () => void): AiContext {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setTheme = useSetTheme()
  const timeZone = useTimeZone()
  const todo = useTodoActions()
  const events = useEventActions()
  const alarms = useAlarmActions()
  const timers = useTimerActions()
  const notes = useNoteActions()
  return useMemo(
    () => ({
      timeZone,
      queryClient,
      navigate: (to: string) => {
        navigate(to, { viewTransition: true })
        onNavigate?.()
      },
      setTheme,
      todo,
      events,
      alarms,
      timers,
      notes,
    }),
    [timeZone, queryClient, navigate, setTheme, todo, events, alarms, timers, notes, onNavigate],
  )
}

export function useConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: async () =>
      (await backend.listRows<Conversation>('ai_conversations', { columns: 'id, title, created_at, updated_at' })).sort((a, b) =>
        (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
      ),
  })
}

/** Conversation avec l'assistant : envoi, outils (avec confirmation), historique. */
export function useAssistant(ctx: AiContext) {
  const queryClient = useQueryClient()
  const preferences = useSettings().data?.preferences.ai
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingCall[] | null>(null)
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null)
  const conversationRef = useRef<string | null>(null)
  // Références vers les fonctions qui se rappellent elles-mêmes (outils en chaîne, « Réessayer »).
  const handleRef = useRef<(response: AssistantResponse) => Promise<void>>(async () => {})
  const guardedRef = useRef<(task: () => Promise<void>) => Promise<void>>(async () => {})

  const add = (message: Omit<ChatMessage, 'id'>) => setMessages((current) => [...current, { ...message, id: crypto.randomUUID() }])

  const call = useCallback(
    async (body: Record<string, unknown>): Promise<AssistantResponse> =>
      backend.callFunction<AssistantResponse>('assistant', { ...body, conversationId: conversationRef.current ?? undefined, tools: DECLARATIONS }),
    [],
  )

  /** Exécute les appels d'outils puis renvoie les résultats au modèle. */
  const runCalls = useCallback(
    async (calls: PendingCall[], accepted: boolean) => {
      setPending(null)
      setBusy(true)
      const results = []
      for (const item of calls) {
        if (!item.tool) {
          results.push({ id: item.id, name: item.name, response: { erreur: 'Outil inconnu.' } })
          continue
        }
        if (!accepted && item.tool.confirm) {
          results.push({ id: item.id, name: item.name, response: { annule: true, message: 'L’utilisateur a annulé cette action.' } })
          add({ role: 'action', text: `✖️ Annulé : ${item.summary}` })
          continue
        }
        try {
          const response = await item.tool.execute(item.args, ctx)
          const failed = 'erreur' in response
          const summary = `${failed ? '⚠️' : '✅'} ${item.summary}${failed ? ` — ${String(response.erreur)}` : ''}`
          if (item.tool.confirm || failed) add({ role: 'action', text: summary })
          results.push({ id: item.id, name: item.name, response, summary: item.tool.confirm || failed ? summary : undefined })
        } catch (cause) {
          results.push({ id: item.id, name: item.name, response: { erreur: (cause as Error).message } })
        }
      }
      return results
    },
    [ctx],
  )

  const handle = useCallback(
    async (response: AssistantResponse): Promise<void> => {
      conversationRef.current = response.conversationId
      setConversationId(response.conversationId)
      if (response.status === 'done') {
        add({ role: 'assistant', text: response.text ?? '', sources: response.sources })
        if (preferences?.speak) speak(response.text ?? '', preferences.voiceURI)
        void queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] })
        return
      }
      const calls: PendingCall[] = (response.calls ?? []).map((item) => {
        const tool = ALL_TOOLS.find((candidate) => candidate.name === item.name)
        return { ...item, tool, summary: tool ? tool.summarize(item.args, ctx) : item.name }
      })
      if (calls.some((item) => item.tool?.confirm)) {
        // Création / suppression : on attend la décision de l'utilisateur.
        setPending(calls)
        setBusy(false)
        return
      }
      const results = await runCalls(calls, true)
      await handleRef.current(await call({ toolResults: results }))
    },
    [call, ctx, preferences, queryClient, runCalls],
  )

  const guarded = useCallback(
    async (task: () => Promise<void>) => {
      setBusy(true)
      setError(null)
      try {
        await task()
      } catch (cause) {
        setError({
          message: cause instanceof FunctionError ? cause.message : 'Impossible de joindre l’assistant. Vérifie ta connexion.',
          retry: () => void guardedRef.current(task),
        })
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  useEffect(() => {
    handleRef.current = handle
    guardedRef.current = guarded
  })

  const send = useCallback(
    (text: string) => {
      const message = text.trim()
      if (!message || busy) return
      add({ role: 'user', text: message })
      void guarded(async () => handle(await call({ message })))
    },
    [busy, call, guarded, handle],
  )

  const decide = useCallback(
    (accepted: boolean) => {
      if (!pending) return
      const calls = pending
      void guarded(async () => {
        const results = await runCalls(calls, accepted)
        await handle(await call({ toolResults: results }))
      })
    },
    [call, guarded, handle, pending, runCalls],
  )

  const newConversation = useCallback(() => {
    conversationRef.current = null
    setConversationId(null)
    setMessages([])
    setPending(null)
    setError(null)
  }, [])

  const openConversation = useCallback(
    async (id: string) => {
      newConversation()
      conversationRef.current = id
      setConversationId(id)
      setBusy(true)
      try {
        const rows = await backend.listRows<ChatMessage>('ai_messages', { filter: { conversation_id: id } })
        setMessages(rows.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')))
      } finally {
        setBusy(false)
      }
    },
    [newConversation],
  )

  const deleteConversations = useCallback(
    async (ids: string[]) => {
      await backend.deleteRows('ai_conversations', ids)
      if (conversationRef.current && ids.includes(conversationRef.current)) newConversation()
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
    [newConversation, queryClient],
  )

  return { conversationId, messages, busy, pending, error, send, decide, newConversation, openConversation, deleteConversations }
}
