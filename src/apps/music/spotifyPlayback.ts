/**
 * Contrôle de la lecture Spotify (pause, suivant, précédent, volume) via l'API Web Spotify.
 *
 * DÉSACTIVÉ : depuis février 2026, l'API Web de Spotify exige que le propriétaire de
 * l'application développeur ait un abonnement Premium. Le module est prêt pour le jour
 * où ce sera le cas. Pour l'activer :
 *   1. créer une application sur https://developer.spotify.com/dashboard (redirect URI :
 *      https://loukilo27.github.io/monhub/ et http://localhost:5173/) ;
 *   2. ajouter VITE_SPOTIFY_CLIENT_ID (public) aux secrets GitHub et à .env.local ;
 *   3. passer SPOTIFY_PLAYBACK_ENABLED à true et brancher SpotifyControls dans MusicPage.
 * Authentification PKCE : aucune clé secrète n'est nécessaire côté navigateur.
 */

export const SPOTIFY_PLAYBACK_ENABLED = false

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing'
const TOKEN_KEY = 'monhub.spotify.token'
const VERIFIER_KEY = 'monhub.spotify.verifier'

interface StoredToken {
  access_token: string
  refresh_token: string
  expires_at: number
}

function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function isSpotifyAvailable(): boolean {
  return SPOTIFY_PLAYBACK_ENABLED && Boolean(CLIENT_ID)
}

/** Étape 1 : redirige vers Spotify pour autoriser l'app (code PKCE). */
export async function connectSpotify() {
  if (!isSpotifyAvailable()) throw new Error('Contrôle Spotify désactivé')
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)))
  const challenge = base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

async function requestToken(body: Record<string, string>): Promise<StoredToken> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID!, ...body }),
  })
  if (!response.ok) throw new Error('Autorisation Spotify refusée')
  const data = (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number }
  const previous = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as StoredToken | null
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? previous?.refresh_token ?? '',
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

/** Étape 2 : au retour de Spotify (?code=…), échange le code contre un jeton. */
export async function completeSpotifyLogin(code: string) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Connexion Spotify expirée')
  sessionStorage.removeItem(VERIFIER_KEY)
  await requestToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier })
}

async function accessToken(): Promise<string> {
  const token = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as StoredToken | null
  if (!token) throw new Error('Spotify non connecté')
  if (token.expires_at > Date.now()) return token.access_token
  return (await requestToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token })).access_token
}

async function player(method: 'GET' | 'PUT' | 'POST', path: string): Promise<Response> {
  if (!isSpotifyAvailable()) throw new Error('Contrôle Spotify désactivé')
  return fetch(`https://api.spotify.com/v1/me/player${path}`, { method, headers: { Authorization: `Bearer ${await accessToken()}` } })
}

export const spotifyPlayback = {
  state: async () => (await player('GET', '')).json().catch(() => null),
  play: () => player('PUT', '/play'),
  pause: () => player('PUT', '/pause'),
  next: () => player('POST', '/next'),
  previous: () => player('POST', '/previous'),
  setVolume: (percent: number) => player('PUT', `/volume?volume_percent=${Math.round(Math.min(100, Math.max(0, percent)))}`),
}
