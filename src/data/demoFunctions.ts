import { FunctionError } from './backend'

/** Réponses factices des Edge Functions pour le mode démo (aucun appel réseau). */
export function demoFunction(name: string, body: Record<string, unknown>): unknown {
  if (name === 'dispatch-reminders') return { sent: 0 }
  if (name !== 'lastfm') throw new FunctionError('unknown', `Fonction inconnue : ${name}`)

  const cover = (seed: number) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="hsl(${seed * 47} 60% 55%)"/></svg>`,
    )}`
  const artists = ['Ziak', 'Josman', 'Daft Punk', 'Angèle', 'Stromae', 'PNL', 'Orelsan', 'Christine and the Queens', 'Gims', 'Nekfeu']

  if (body.action === 'recent') {
    const now = Date.now()
    return {
      nowPlaying: { name: 'Get Lucky', artist: 'Daft Punk', album: 'Random Access Memories', image: cover(3), url: '#', playedAt: null, nowPlaying: true },
      recent: artists.slice(0, 8).map((artist, index) => ({
        name: `Titre ${index + 1}`,
        artist,
        album: `Album ${index + 1}`,
        image: cover(index),
        url: '#',
        playedAt: new Date(now - (index + 1) * 4 * 60_000).toISOString(),
        nowPlaying: false,
      })),
      totalScrobbles: 1534,
    }
  }

  const period = String(body.period ?? 'month')
  const yearly = period.includes('year')
  const histogram = Array.from({ length: yearly ? 12 : 22 }, (_, index) => ({
    label: yearly ? ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][index] : String(index + 1),
    count: Math.round((yearly ? 300 : 20) * (1 + Math.sin(index * 1.3)) + (index % 3) * 4),
  }))
  return {
    period,
    label: yearly ? '2026' : 'octobre 2026',
    from: '2026-09-30T22:00:00.000Z',
    to: new Date().toISOString(),
    total: histogram.reduce((sum, bucket) => sum + bucket.count, 0),
    histogram,
    tracks: artists.map((artist, index) => ({ name: `Titre phare ${index + 1}`, artist, plays: 40 - index * 3, url: '#', image: cover(index) })),
    artists: artists.map((artist, index) => ({ name: artist, plays: 120 - index * 9, url: '#', image: cover(index + 2) })),
    albums: artists.map((artist, index) => ({ name: `Album ${index + 1}`, artist, plays: 70 - index * 5, url: '#', image: cover(index + 5) })),
    computedAt: new Date().toISOString(),
  }
}
