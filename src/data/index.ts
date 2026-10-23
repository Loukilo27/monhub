import type { Backend } from './backend'
import { localBackend } from './localBackend'
import { Outbox, withOutbox } from './outbox'
import { supabaseBackend } from './supabaseBackend'

/**
 * Mode démo : `VITE_DEMO_MODE=true` (uniquement en développement / tests de bout en bout).
 * L'app s'ouvre sans connexion avec des données locales factices.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const inner: Backend = isDemoMode ? localBackend : supabaseBackend

/** Modifications faites hors-ligne, en attente d'envoi. */
export const outbox = new Outbox(inner)

export const backend: Backend = withOutbox(inner, outbox)
