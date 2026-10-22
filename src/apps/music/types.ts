import type { MusicPeriod } from '../../../supabase/functions/_shared/music'

export type { MusicPeriod }

export interface ChartItem {
  name: string
  artist?: string
  plays: number
  url: string
  image: string | null
}

export interface RecentTrack {
  name: string
  artist: string
  album: string
  image: string | null
  url: string
  playedAt: string | null
  nowPlaying: boolean
}

/** Réponse de l'Edge Function lastfm, action « recent ». */
export interface RecentData {
  nowPlaying: RecentTrack | null
  recent: RecentTrack[]
  totalScrobbles: number
}

/** Réponse de l'Edge Function lastfm, action « top ». */
export interface TopData {
  period: MusicPeriod
  label: string
  from: string
  to: string
  total: number
  histogram: { label: string; count: number }[]
  tracks: ChartItem[]
  artists: ChartItem[]
  albums: ChartItem[]
  computedAt: string
}

/** Ligne de la table music_playlists. */
export interface Playlist {
  id: string
  title: string
  spotify_url: string
  position: number
}

export const PERIODS: { id: MusicPeriod; label: string }[] = [
  { id: 'month', label: 'Ce mois-ci' },
  { id: 'prev-month', label: 'Mois dernier' },
  { id: 'year', label: 'Cette année' },
  { id: 'prev-year', label: 'Année dernière' },
]
