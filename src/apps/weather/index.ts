import { lazy } from 'react'
import { CloudSun } from 'lucide-react'
import type { MiniApp } from '../types'

export const weatherApp: MiniApp = {
  id: 'weather',
  name: 'Météo',
  description: 'Météo actuelle et prévisions de tes villes',
  icon: CloudSun,
  color: '#0ea5e9',
  Page: lazy(() => import('./WeatherPage')),
  widgets: [
    {
      id: 'city',
      name: 'Météo d’une ville',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
        { w: 4, h: 1 },
      ],
      Component: lazy(() => import('./WeatherWidget')),
    },
  ],
  aiActions: [],
}
