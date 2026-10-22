/**
 * Étape d'authentification de l'app :
 * - loading      : session en cours de lecture
 * - signedOut    : pas de session → écran de connexion
 * - enrollMfa    : connecté par mot de passe mais aucune 2FA configurée → configuration obligatoire
 * - verifyMfa    : 2FA configurée mais pas encore validée sur cette session → saisie du code
 * - ready        : session de niveau aal2, accès aux données
 */
export type AuthStage = 'loading' | 'signedOut' | 'enrollMfa' | 'verifyMfa' | 'ready'

export interface AssuranceLevel {
  currentLevel: string | null
  nextLevel: string | null
}

export function deriveAuthStage(hasSession: boolean, aal: AssuranceLevel | null): AuthStage {
  if (!hasSession) return 'signedOut'
  if (!aal) return 'loading'
  if (aal.currentLevel === 'aal2') return 'ready'
  if (aal.nextLevel === 'aal2') return 'verifyMfa'
  return 'enrollMfa'
}

/** Traduit les erreurs Supabase Auth les plus courantes. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return ''
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return 'Cette adresse e-mail n’a pas encore été confirmée.'
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
      return 'Code incorrect ou expiré. Réessaie avec le code affiché maintenant.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Trop de tentatives. Patiente quelques minutes.'
    case 'signup_disabled':
      return 'Les inscriptions sont fermées.'
  }
  if (error.status === 0 || /fetch|network/i.test(error.message ?? '')) {
    return 'Impossible de joindre le serveur. Vérifie ta connexion.'
  }
  return error.message || 'Une erreur est survenue.'
}
