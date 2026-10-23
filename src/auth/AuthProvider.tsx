import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearCachedData } from '../data/queryClient'
import { requireSupabase } from '../lib/supabase'
import { deriveAuthStage, type AssuranceLevel } from './stage'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [aal, setAal] = useState<AssuranceLevel | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await requireSupabase().auth.mfa.getAuthenticatorAssuranceLevel()
    setAal(data ? { currentLevel: data.currentLevel, nextLevel: data.nextLevel } : { currentLevel: null, nextLevel: null })
  }, [])

  useEffect(() => {
    const supabase = requireSupabase()
    // onAuthStateChange émet INITIAL_SESSION au démarrage, puis chaque connexion,
    // déconnexion ou renouvellement de jeton.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoaded(true)
      // On garde le niveau connu pendant les renouvellements de jeton (sinon l'app
      // repasserait par l'écran de chargement toutes les heures) et on le relit en arrière-plan.
      // Ne pas appeler l'API Supabase directement dans ce callback (risque de blocage) : on diffère.
      if (nextSession) setTimeout(() => void refresh(), 0)
      else setAal(null)
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const signOut = useCallback(async (everywhere = false) => {
    await requireSupabase().auth.signOut({ scope: everywhere ? 'global' : 'local' })
    // Aucune donnée personnelle ne reste dans le navigateur après déconnexion.
    await clearCachedData()
  }, [])

  const stage = sessionLoaded ? deriveAuthStage(Boolean(session), aal) : 'loading'
  const value = useMemo(() => ({ stage, session, refresh, signOut }), [stage, session, refresh, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
