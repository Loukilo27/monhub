/** Types de contenus Spotify intégrables. */
const TYPES = ['playlist', 'album', 'track', 'artist', 'show', 'episode']

/**
 * Lien Spotify (open.spotify.com/…, avec ou sans /intl-fr/, ou spotify:playlist:…) → adresse du lecteur intégré.
 * Renvoie null si le lien n'est pas reconnu.
 */
export function spotifyEmbedUrl(link: string): string | null {
  const trimmed = link.trim()
  const uri = trimmed.match(/^spotify:(\w+):([A-Za-z0-9]+)$/)
  if (uri && TYPES.includes(uri[1])) return `https://open.spotify.com/embed/${uri[1]}/${uri[2]}`
  try {
    const url = new URL(trimmed)
    if (url.hostname !== 'open.spotify.com') return null
    const parts = url.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('intl-'))
    const [type, id] = parts[0] === 'embed' ? parts.slice(1) : parts
    if (!TYPES.includes(type) || !id || !/^[A-Za-z0-9]+$/.test(id)) return null
    return `https://open.spotify.com/embed/${type}/${id}`
  } catch {
    return null
  }
}

/** Lien canonique enregistré (sans paramètres de suivi). */
export function canonicalSpotifyUrl(link: string): string | null {
  const embed = spotifyEmbedUrl(link)
  return embed && embed.replace('/embed/', '/')
}
