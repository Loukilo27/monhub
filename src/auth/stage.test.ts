import { describe, expect, it } from 'vitest'
import { authErrorMessage, deriveAuthStage } from './stage'

describe('deriveAuthStage', () => {
  it('renvoie vers la connexion sans session', () => {
    expect(deriveAuthStage(false, null)).toBe('signedOut')
    expect(deriveAuthStage(false, { currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('signedOut')
  })

  it('attend le niveau d’assurance après connexion', () => {
    expect(deriveAuthStage(true, null)).toBe('loading')
  })

  it('distingue configuration et vérification de la 2FA', () => {
    expect(deriveAuthStage(true, { currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enrollMfa')
    expect(deriveAuthStage(true, { currentLevel: 'aal1', nextLevel: 'aal2' })).toBe('verifyMfa')
  })

  it('ouvre l’app uniquement en aal2', () => {
    expect(deriveAuthStage(true, { currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('ready')
  })
})

describe('authErrorMessage', () => {
  it('traduit les codes connus', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe('E-mail ou mot de passe incorrect.')
    expect(authErrorMessage({ code: 'mfa_verification_failed' })).toMatch(/Code incorrect/)
  })

  it('signale les erreurs réseau', () => {
    expect(authErrorMessage({ message: 'Failed to fetch', status: 0 })).toMatch(/joindre le serveur/)
  })

  it('ne renvoie rien sans erreur', () => {
    expect(authErrorMessage(null)).toBe('')
  })
})
