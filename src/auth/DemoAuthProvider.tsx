import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './useAuth'

const demoSession = { user: { id: 'demo', email: 'demo@monhub.local' } } as Session

const value: AuthContextValue = {
  stage: 'ready',
  session: demoSession,
  refresh: async () => {},
  signOut: async () => {},
}

/** Mode démo : session factice, aucune connexion à Supabase. */
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
