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
  widgets: [
    {
      id: 'upcoming',
      name: 'Prochains rendez-vous',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
      ],
      Component: lazy(() => import('./UpcomingWidget')),
    },
  ],
  aiActions: [],
}
