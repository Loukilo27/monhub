import { describe, expect, it } from 'vitest'
import { canonicalSpotifyUrl, spotifyEmbedUrl } from './spotifyEmbed'

describe('liens Spotify', () => {
  it('reconnaît les liens de partage, avec langue et paramètres', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123')).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    )
    expect(spotifyEmbedUrl('https://open.spotify.com/intl-fr/album/4m2880jivSbbyEGAKfITCa')).toBe('https://open.spotify.com/embed/album/4m2880jivSbbyEGAKfITCa')
    expect(spotifyEmbedUrl('spotify:track:11dFghVXANMlKmJXsNCbNl')).toBe('https://open.spotify.com/embed/track/11dFghVXANMlKmJXsNCbNl')
  })

  it('refuse les autres sites et les liens incomplets', () => {
    expect(spotifyEmbedUrl('https://evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBeNull()
    expect(spotifyEmbedUrl('https://open.spotify.com/user/abc')).toBeNull()
    expect(spotifyEmbedUrl('pas un lien')).toBeNull()
  })

  it('enregistre un lien propre', () => {
    expect(canonicalSpotifyUrl('https://open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x')).toBe(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    )
  })
})
