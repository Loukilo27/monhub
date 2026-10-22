import { lazy } from 'react'
import { AlarmClock } from 'lucide-react'
import type { MiniApp } from '../types'

export const clockApp: MiniApp = {
  id: 'clock',
  name: 'Horloge',
  description: 'Horloge, fuseaux, alarmes, chrono et minuteurs',
  icon: AlarmClock,
  color: '#f59e0b',
  Page: lazy(() => import('./ClockPage')),
  widgets: [],
  aiActions: [],
}
