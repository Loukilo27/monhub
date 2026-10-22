// Statistiques d'écoute Last.fm. La clé API reste ici (secret LASTFM_API_KEY) ;
// seul le propriétaire (jeton aal2) peut appeler la fonction. Résultats mis en cache.
import { adminClient, corsHeaders, env, json, requireOwner, safeEqual } from '../_shared/admin.ts'
import { parseChart, parseRecent, periodRange, pickImage, unix, type ChartItem, type MusicPeriod } from '../_shared/music.ts'

type Json = Record<string, unknown>
type Admin = ReturnType<typeof adminClient>

const API = 'https://ws.audioscrobbler.com/2.0/'
const PERIODS: MusicPeriod[] = ['month', 'prev-month', 'year', 'prev-year']
const IMAGE_TTL = 30 * 24 * 3600_000
const TOP_LIMIT = 10

class LastfmError extends Error {
  constructor(public code: number, message: string) {
    super(message)
  }
}

async function call(method: string, params: Record<string, string | number>): Promise<Json> {
  const url = new URL(API)
  url.search = new URLSearchParams({ method, api_key: env('LASTFM_API_KEY'), format: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) }).toString()
  const response = await fetch(url, { headers: { 'User-Agent': 'MonHub/1.0 (tableau de bord personnel)' } })
  const body = (await response.json().catch(() => ({}))) as Json
  if (body.error) throw new LastfmError(Number(body.error), String(body.message ?? 'Erreur Last.fm'))
  if (!response.ok) throw new LastfmError(response.status, 'Erreur Last.fm')
  return body
}

/** Exécute au plus `limit` requêtes à la fois (Last.fm limite le débit). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await fn(items[index])
      }
    }),
  )
  return results
}

/** Lecture / écriture du cache. Un résultat vide (null) n'est gardé qu'une journée. */
async function cached<T>(admin: Admin, userId: string, key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const { data } = await admin.from('music_cache').select('data, expires_at').eq('user_id', userId).eq('key', key).maybeSingle()
  if (data && new Date(data.expires_at) > new Date()) return data.data as T
  const value = await compute()
  const ttl = value === null ? Math.min(ttlMs, 24 * 3600_000) : ttlMs
  await admin.from('music_cache').upsert({ user_id: userId, key, data: value, expires_at: new Date(Date.now() + ttl).toISOString() })
  return value
}

async function artistImage(artist: string): Promise<string | null> {
  const albums = await call('artist.getTopAlbums', { artist, limit: 1, autocorrect: 1 })
  const first = ((albums.topalbums as Json | undefined)?.album as Json[] | Json | undefined) ?? []
  return pickImage((Array.isArray(first) ? first[0] : first)?.image)
}

/** Pochettes : celle de l'album (titres, albums) ou du premier album de l'artiste. Mises en cache 30 jours. */
async function withImages(admin: Admin, userId: string, items: ChartItem[], kind: 'track' | 'artist' | 'album'): Promise<ChartItem[]> {
  return mapLimit(items, 4, async (item) => {
    if (item.image) return item
    const key = `img:${kind}:${item.artist ?? ''}|${item.name}`.toLowerCase().slice(0, 300)
    const image = await cached(admin, userId, key, IMAGE_TTL, async () => {
      try {
        if (kind === 'album') {
          const info = await call('album.getInfo', { artist: item.artist ?? '', album: item.name, autocorrect: 1 })
          return pickImage((info.album as Json | undefined)?.image)
        }
        if (kind === 'track') {
          const info = await call('track.getInfo', { artist: item.artist ?? '', track: item.name, autocorrect: 1 })
          // Sans pochette pour le titre : celle du principal album de l'artiste.
          return pickImage(((info.track as Json | undefined)?.album as Json | undefined)?.image) ?? (await artistImage(item.artist ?? ''))
        }
        return await artistImage(item.name)
      } catch {
        return null
      }
    })
    return { ...item, image }
  })
}

async function recentOverview(user: string) {
  const { tracks, total } = parseRecent(await call('user.getRecentTracks', { user, limit: 30 }))
  return {
    nowPlaying: tracks.find((track) => track.nowPlaying) ?? null,
    recent: tracks.filter((track) => !track.nowPlaying),
    totalScrobbles: total,
  }
}

async function topForPeriod(admin: Admin, userId: string, user: string, period: MusicPeriod, timeZone: string) {
  const range = periodRange(period, new Date(), timeZone)
  const window = { user, from: unix(range.from), to: unix(range.to) }
  const [tracks, artists, albums, totals, recent] = await Promise.all([
    call('user.getWeeklyTrackChart', window).then((data) => parseChart(data, 'track').slice(0, TOP_LIMIT)),
    call('user.getWeeklyArtistChart', window).then((data) => parseChart(data, 'artist').slice(0, TOP_LIMIT)),
    call('user.getWeeklyAlbumChart', window).then((data) => parseChart(data, 'album').slice(0, TOP_LIMIT)),
    // Écoutes par jour (mois) ou par mois (année) : nombre total renvoyé par une page d'un seul élément.
    mapLimit(range.buckets, 4, async (bucket) => ({
      label: bucket.label,
      count:
        bucket.to <= bucket.from
          ? 0
          : parseRecent(await call('user.getRecentTracks', { user, limit: 1, from: unix(bucket.from), to: unix(bucket.to) })).total,
    })),
    // Dernières écoutes de la période : elles portent la pochette de chaque titre.
    call('user.getRecentTracks', { ...window, limit: 200 }).then((data) => parseRecent(data).tracks),
  ])
  const seenCovers = new Map(recent.filter((track) => track.image).map((track) => [`${track.artist}|${track.name}`.toLowerCase(), track.image]))
  for (const track of tracks) track.image ??= seenCovers.get(`${track.artist}|${track.name}`.toLowerCase()) ?? null
  return {
    period,
    label: range.label,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    total: totals.reduce((sum, bucket) => sum + bucket.count, 0),
    histogram: totals,
    tracks: await withImages(admin, userId, tracks, 'track'),
    artists: await withImages(admin, userId, artists, 'artist'),
    albums: await withImages(admin, userId, albums, 'album'),
    computedAt: new Date().toISOString(),
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Méthode non autorisée' }, 405)

  const admin = adminClient()
  const cronSecret = request.headers.get('x-cron-secret')
  const fromServer = cronSecret !== null && safeEqual(cronSecret, env('CRON_SECRET'))
  if (!fromServer && !(await requireOwner(request, admin))) return json(request, { error: 'Accès refusé' }, 401)
  const userId = env('OWNER_USER_ID')

  const body = (await request.json().catch(() => ({}))) as { action?: string; period?: MusicPeriod; refresh?: boolean }
  const { data: settings } = await admin.from('settings').select('time_zone, preferences').eq('user_id', userId).maybeSingle()
  const user = settings?.preferences?.music?.lastfmUser as string | undefined
  if (!user) return json(request, { error: 'no_user', message: 'Indique ton nom d’utilisateur Last.fm.' }, 400)
  const timeZone = settings?.time_zone ?? 'Europe/Paris'

  try {
    if (body.action === 'recent') return json(request, await cached(admin, userId, `recent:${user}`, 20_000, () => recentOverview(user)))

    if (body.action === 'top' && body.period && PERIODS.includes(body.period)) {
      const current = body.period === 'month' || body.period === 'year'
      const range = periodRange(body.period, new Date(), timeZone)
      const key = `top:${user}:${body.period}:${range.from.toISOString()}`
      if (body.refresh) await admin.from('music_cache').delete().eq('user_id', userId).eq('key', key)
      const ttl = current ? 30 * 60_000 : 7 * 24 * 3600_000
      return json(request, await cached(admin, userId, key, ttl, () => topForPeriod(admin, userId, user, body.period!, timeZone)))
    }

    return json(request, { error: 'Requête invalide' }, 400)
  } catch (error) {
    if (error instanceof LastfmError) {
      if (error.code === 6) return json(request, { error: 'user_not_found', message: `Utilisateur Last.fm « ${user} » introuvable.` }, 404)
      if (error.code === 29) return json(request, { error: 'rate_limited', message: 'Last.fm limite les requêtes : réessaie dans une minute.' }, 429)
      if (error.code === 10 || error.code === 26) return json(request, { error: 'invalid_key', message: 'Clé API Last.fm invalide.' }, 500)
      return json(request, { error: 'lastfm', message: error.message }, 502)
    }
    return json(request, { error: 'internal', message: (error as Error).message }, 500)
  }
})
