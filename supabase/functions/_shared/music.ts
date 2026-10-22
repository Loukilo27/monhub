// Statistiques Last.fm : périodes calendaires et lecture des réponses de l'API.
// Code pur partagé (Edge Function « lastfm », app), testé par Vitest (music.test.ts).

import { zonedParts, zonedToUtc } from './zonedTime.ts'

export type MusicPeriod = 'month' | 'prev-month' | 'year' | 'prev-year'

export interface Bucket {
  label: string
  from: Date
  to: Date
}

export interface PeriodRange {
  from: Date
  to: Date
  /** Découpage pour le graphique : jours d'un mois, ou mois d'une année. */
  buckets: Bucket[]
  label: string
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** Bornes d'une période calendaire dans le fuseau donné ; la période en cours s'arrête à `now`. */
export function periodRange(period: MusicPeriod, now: Date, timeZone: string): PeriodRange {
  const today = zonedParts(now, timeZone)
  const startOf = (year: number, month: number, day = 1) => zonedToUtc(year, month, day, 0, 0, timeZone)
  const clamp = (date: Date) => (date > now ? now : date)

  if (period === 'month' || period === 'prev-month') {
    const year = period === 'month' ? today.year : today.month === 1 ? today.year - 1 : today.year
    const month = period === 'month' ? today.month : today.month === 1 ? 12 : today.month - 1
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const lastDay = period === 'month' ? today.day : days
    const buckets = Array.from({ length: lastDay }, (_, index) => ({
      label: String(index + 1),
      from: startOf(year, month, index + 1),
      to: clamp(startOf(year, month, index + 2)),
    }))
    return {
      from: startOf(year, month),
      to: period === 'month' ? now : startOf(year, month + 1),
      buckets,
      label: `${MONTHS[month - 1]} ${year}`,
    }
  }

  const year = period === 'year' ? today.year : today.year - 1
  const lastMonth = period === 'year' ? today.month : 12
  const buckets = Array.from({ length: lastMonth }, (_, index) => ({
    label: SHORT_MONTHS[index],
    from: startOf(year, index + 1),
    to: clamp(startOf(year, index + 2)),
  }))
  return { from: startOf(year, 1), to: period === 'year' ? now : startOf(year + 1, 1), buckets, label: String(year) }
}

export const unix = (date: Date) => Math.floor(date.getTime() / 1000)

// ---------- Réponses de l'API ----------

type Json = Record<string, unknown>

/** L'API renvoie un objet seul au lieu d'un tableau quand il n'y a qu'un résultat. */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** Image « étoile » renvoyée par Last.fm quand il n'a pas de visuel. */
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

export function pickImage(images: unknown): string | null {
  const list = toArray(images as { size?: string; '#text'?: string }[])
  for (const size of ['extralarge', 'large', 'mega', 'medium', 'small']) {
    const url = list.find((image) => image.size === size)?.['#text']
    if (url && !url.includes(PLACEHOLDER)) return url
  }
  return null
}

/** Champ texte de l'API : chaîne simple, ou objet { '#text' } / { name }. */
function text(value: unknown): string {
  if (typeof value === 'string') return value
  const object = value as Json | undefined
  return String(object?.['#text'] ?? object?.name ?? '')
}

export interface ChartItem {
  name: string
  artist?: string
  plays: number
  url: string
  image: string | null
}

export function parseChart(json: Json, kind: 'track' | 'artist' | 'album'): ChartItem[] {
  const root = json[`weekly${kind}chart`] as Json | undefined
  return toArray(root?.[kind] as Json[]).map((item) => ({
    name: String(item.name ?? ''),
    artist: kind === 'artist' ? undefined : text(item.artist),
    plays: Number(item.playcount ?? 0),
    url: String(item.url ?? ''),
    image: pickImage(item.image),
  }))
}

export interface RecentTrack {
  name: string
  artist: string
  album: string
  image: string | null
  url: string
  /** Absent pour le titre en cours d'écoute. */
  playedAt: string | null
  nowPlaying: boolean
}

export function parseRecent(json: Json): { tracks: RecentTrack[]; total: number } {
  const root = json.recenttracks as Json | undefined
  const tracks = toArray(root?.track as Json[]).map((item) => {
    const date = item.date as { uts?: string } | undefined
    return {
      name: String(item.name ?? ''),
      artist: text(item.artist),
      album: text(item.album),
      image: pickImage(item.image),
      url: String(item.url ?? ''),
      playedAt: date?.uts ? new Date(Number(date.uts) * 1000).toISOString() : null,
      nowPlaying: (item['@attr'] as Json | undefined)?.nowplaying === 'true',
    }
  })
  const total = Number((root?.['@attr'] as Json | undefined)?.total ?? tracks.length)
  return { tracks, total }
}
