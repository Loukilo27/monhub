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
  widgets: [],
  aiActions: [],
}
