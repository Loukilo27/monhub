import type { Backend } from './backend'
import { localBackend } from './localBackend'
import { supabaseBackend } from './supabaseBackend'

/**
 * Mode démo : `VITE_DEMO_MODE=true` (uniquement en développement / tests de bout en bout).
 * L'app s'ouvre sans connexion avec des données locales factices.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export const backend: Backend = isDemoMode ? localBackend : supabaseBackend
