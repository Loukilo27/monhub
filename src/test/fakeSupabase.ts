import { vi } from 'vitest'

export interface FakeSupabaseOptions {
  signedIn?: boolean
  currentLevel?: 'aal1' | 'aal2'
  nextLevel?: 'aal1' | 'aal2'
}

/** Client Supabase factice couvrant ce que l'app utilise, pour les tests. */
export function createFakeSupabase({ signedIn = true, currentLevel = 'aal2', nextLevel = 'aal2' }: FakeSupabaseOptions = {}) {
  const session = signedIn ? { user: { id: 'user-1', email: 'moi@example.com' }, access_token: 'jeton' } : null
  const query = {
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: { theme: 'system' }, error: null })),
    upsert: vi.fn(async () => ({ data: null, error: null })),
  }
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) }
  return {
    auth: {
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        queueMicrotask(() => callback('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInWithPassword: vi.fn(async () => ({ data: null, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })),
      signOut: vi.fn(async () => ({ error: null })),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({ data: { currentLevel, nextLevel, currentAuthenticationMethods: [] }, error: null })),
        listFactors: vi.fn(async () => ({ data: { all: [], totp: [] }, error: null })),
        enroll: vi.fn(async () => ({ data: { id: 'f1', totp: { qr_code: 'data:image/svg+xml,', secret: 'SECRET', uri: '' } }, error: null })),
        unenroll: vi.fn(async () => ({ data: null, error: null })),
        challengeAndVerify: vi.fn(async () => ({ data: null, error: null })),
      },
    },
    from: vi.fn(() => query),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  }
}
