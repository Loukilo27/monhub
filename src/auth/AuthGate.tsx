import type { ReactNode } from 'react'
import { Spinner } from '../components/Spinner'
import { LoginPage } from './LoginPage'
import { MfaEnrollPage } from './MfaEnrollPage'
import { MfaVerifyPage } from './MfaVerifyPage'
import { useAuth } from './useAuth'

/** N'affiche l'app qu'à une session validée par mot de passe + 2FA. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { stage } = useAuth()
  switch (stage) {
    case 'loading':
      return (
        <div className="grid min-h-full place-items-center">
          <Spinner />
        </div>
      )
    case 'signedOut':
      return <LoginPage />
    case 'enrollMfa':
      return <MfaEnrollPage />
    case 'verifyMfa':
      return <MfaVerifyPage />
    case 'ready':
      return children
  }
}
