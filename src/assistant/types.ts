import type { QueryClient } from '@tanstack/react-query'
import type { useAlarmActions } from '../apps/clock/alarms'
import type { useTimerActions } from '../apps/clock/timers'
import type { useEventActions } from '../apps/calendar/data'
import type { useNoteActions } from '../apps/notes/data'
import type { useTodoActions } from '../apps/todo/data'
import type { ThemePreference } from '../theme/theme'

/** Schéma JSON (sous-ensemble) des paramètres d'un outil. */
export interface ToolSchema {
  type: 'object'
  properties: Record<string, { type: string; description?: string; enum?: string[]; items?: { type: string } }>
  required?: string[]
}

/** Ce dont un outil a besoin pour agir dans l'app (actions des mini-applis, navigation…). */
export interface AiContext {
  timeZone: string
  queryClient: QueryClient
  navigate: (to: string) => void
  setTheme: (theme: ThemePreference) => void
  todo: ReturnType<typeof useTodoActions>
  events: ReturnType<typeof useEventActions>
  alarms: ReturnType<typeof useAlarmActions>
  timers: ReturnType<typeof useTimerActions>
  notes: ReturnType<typeof useNoteActions>
}

export type ToolArgs = Record<string, unknown>

/**
 * Action proposée à l'assistant (function calling). Déclarée par chaque mini-appli dans le
 * registre : l'app envoie les déclarations à Gemini, puis exécute les appels qu'il demande.
 */
export interface AiTool {
  name: string
  description: string
  parameters: ToolSchema
  /** Création / suppression : récapitulatif montré à l'utilisateur, qui confirme ou annule. */
  confirm: boolean
  /** Phrase courte décrivant l'action (confirmation et historique). */
  summarize: (args: ToolArgs, ctx: AiContext) => string
  execute: (args: ToolArgs, ctx: AiContext) => Promise<Record<string, unknown>>
}
