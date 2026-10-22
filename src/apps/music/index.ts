import { lazy } from 'react'
import { Music } from 'lucide-react'
import type { MiniApp } from '../types'

export const musicApp: MiniApp = {
  id: 'music',
  name: 'Musique',
  description: 'Statistiques Last.fm et lecteur Spotify',
  icon: Music,
  color: '#ec4899',
  Page: lazy(() => import('./MusicPage')),
  widgets: [
    {
      id: 'now-playing',
      name: 'En écoute',
      sizes: [
        { w: 2, h: 1 },
        { w: 4, h: 1 },
        { w: 4, h: 2 },
      ],
      Component: lazy(() => import('./NowPlayingWidget')),
    },
    {
      id: 'top-artists',
      name: 'Top artistes du mois',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
      ],
      Component: lazy(() => import('./TopArtistsWidget')),
    },
  ],
  aiActions: [],
}
