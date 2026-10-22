import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Faux si l'URL ou la clé publique manquent (build sans secrets, tests). */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        // Session conservée dans le navigateur et renouvelée automatiquement :
        // pas besoin de se reconnecter à chaque démarrage.
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'monhub.auth',
        detectSessionInUrl: false,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase n’est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  return supabase
}
