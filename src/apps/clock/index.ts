import { lazy } from 'react'
import { AlarmClock } from 'lucide-react'
import type { MiniApp } from '../types'
import { clockTools } from './ai'

export const clockApp: MiniApp = {
  id: 'clock',
  name: 'Horloge',
  description: 'Horloge, fuseaux, alarmes, chrono et minuteurs',
  icon: AlarmClock,
  color: '#f59e0b',
  Page: lazy(() => import('./ClockPage')),
  widgets: [
    {
      id: 'clock',
      name: 'Horloge',
      sizes: [
        { w: 2, h: 2 },
        { w: 2, h: 1 },
        { w: 4, h: 2 },
      ],
      Component: lazy(() => import('./ClockWidget')),
    },
    {
      id: 'world-clocks',
      name: 'Fuseaux horaires',
      sizes: [
        { w: 4, h: 2 },
        { w: 2, h: 2 },
      ],
      Component: lazy(() => import('./WorldClocksWidget')),
    },
    {
      id: 'next-alarm',
      name: 'Prochaine alarme',
      sizes: [
        { w: 2, h: 1 },
        { w: 4, h: 1 },
      ],
      Component: lazy(() => import('./NextAlarmWidget')),
    },
  ],
  aiActions: clockTools,
}
