import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { requireSupabase } from '../lib/supabase'
import { AuthLayout, FormError, inputClass, primaryButtonClass } from './AuthLayout'
import { authErrorMessage } from './stage'

/** Connexion par e-mail + mot de passe. Pas d'inscription : le seul compte est créé depuis Supabase. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password })
    setPending(false)
    if (error) setError(authErrorMessage(error))
  }

  return (
    <AuthLayout title="MonHub" subtitle="Connecte-toi pour accéder à ton tableau de bord.">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>
        <FormError message={error} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          Se connecter
        </button>
      </form>
    </AuthLayout>
  )
}
