import { LoaderCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { requireSupabase } from '../lib/supabase'
import { AuthLayout, FormError, primaryButtonClass, secondaryButtonClass } from './AuthLayout'
import { OtpInput } from './OtpInput'
import { authErrorMessage } from './stage'
import { useAuth } from './useAuth'

interface Enrollment {
  factorId: string
  qrCode: string
  secret: string
}

/**
 * Configuration obligatoire de la 2FA à la première connexion : tant qu'elle n'est pas faite,
 * la base refuse tout accès aux données (politique « 2FA obligatoire »).
 */
export function MfaEnrollPage() {
  const { refresh, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      const supabase = requireSupabase()
      // Nettoie un éventuel enrôlement commencé puis abandonné (QR code jamais validé).
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const factor of factors?.all ?? []) {
        if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `MonHub ${new Date().toISOString().slice(0, 10)}`,
      })
      if (cancelled) {
        if (data) await supabase.auth.mfa.unenroll({ factorId: data.id })
        return
      }
      if (error || !data) setError(authErrorMessage(error) || 'Impossible de démarrer la configuration.')
      else setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!enrollment) return
    setPending(true)
    setError('')
    const { error } = await requireSupabase().auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code })
    if (error) {
      setPending(false)
      setCode('')
      setError(authErrorMessage(error))
      return
    }
    await refresh()
  }

  return (
    <AuthLayout
      title="Active la double authentification"
      subtitle="Obligatoire pour protéger tes données, même si ton mot de passe fuitait."
    >
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Ouvre une application d’authentification (Google Authenticator, Microsoft Authenticator, 2FAS…).</li>
        <li>Scanne ce QR code, ou saisis la clé à la main.</li>
        <li>Entre le code à 6 chiffres affiché.</li>
      </ol>
      {enrollment ? (
        <>
          <div className="mx-auto mb-3 w-fit rounded-2xl bg-white p-3">
            <img src={enrollment.qrCode} alt="QR code à scanner avec l’application d’authentification" className="size-44" />
          </div>
          <p className="mb-4 text-center text-xs text-muted">
            Clé :{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono break-all select-all">{enrollment.secret}</code>
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <OtpInput value={code} onChange={setCode} />
            <FormError message={error} />
            <button type="submit" disabled={pending || code.length !== 6} className={primaryButtonClass}>
              {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              Activer
            </button>
          </form>
        </>
      ) : error ? (
        <FormError message={error} />
      ) : (
        <div className="flex justify-center py-10 text-muted">
          <LoaderCircle aria-label="Préparation…" className="size-6 animate-spin" />
        </div>
      )}
      <button type="button" onClick={() => void signOut()} className={`${secondaryButtonClass} mt-2`}>
        Se déconnecter
      </button>
    </AuthLayout>
  )
}
