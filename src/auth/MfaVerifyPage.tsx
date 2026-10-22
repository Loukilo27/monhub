import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { requireSupabase } from '../lib/supabase'
import { AuthLayout, FormError, primaryButtonClass, secondaryButtonClass } from './AuthLayout'
import { OtpInput } from './OtpInput'
import { authErrorMessage } from './stage'
import { useAuth } from './useAuth'

/** Deuxième étape de connexion : code de l'application d'authentification. */
export function MfaVerifyPage() {
  const { refresh, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    const supabase = requireSupabase()
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp[0]
    if (listError || !factor) {
      setPending(false)
      setError(authErrorMessage(listError) || 'Aucune application d’authentification trouvée.')
      return
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    if (error) {
      setPending(false)
      setCode('')
      setError(authErrorMessage(error))
      return
    }
    await refresh()
  }

  return (
    <AuthLayout title="Vérification en deux étapes" subtitle="Saisis le code affiché dans ton application d’authentification.">
      <form onSubmit={onSubmit} className="space-y-4">
        <OtpInput value={code} onChange={setCode} />
        <FormError message={error} />
        <button type="submit" disabled={pending || code.length !== 6} className={primaryButtonClass}>
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          Valider
        </button>
        <button type="button" onClick={() => void signOut()} className={secondaryButtonClass}>
          Changer de compte
        </button>
      </form>
    </AuthLayout>
  )
}
