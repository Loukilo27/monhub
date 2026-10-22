import { lazy } from 'react'
import { CalendarDays } from 'lucide-react'
import type { MiniApp } from '../types'

export const calendarApp: MiniApp = {
  id: 'calendar',
  name: 'Calendrier',
  description: 'Mois, semaine, jour et agenda',
  icon: CalendarDays,
  color: '#3b82f6',
  Page: lazy(() => import('./CalendarPage')),
  widgets: [],
  aiActions: [],
}
