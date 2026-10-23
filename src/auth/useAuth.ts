import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { AuthStage } from './stage'

export interface AuthContextValue {
  stage: AuthStage
  session: Session | null
  /** Relit le niveau d'assurance (après validation d'un code 2FA). */
  refresh: () => Promise<void>
  /** Déconnexion de cet appareil, ou de tous (`everywhere`). */
  signOut: (everywhere?: boolean) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return context
}
