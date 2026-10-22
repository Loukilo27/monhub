import { lazy } from 'react'
import { ListChecks } from 'lucide-react'
import type { MiniApp } from '../types'
import { todoTools } from './ai'

export const todoApp: MiniApp = {
  id: 'todo',
  name: 'Tâches',
  description: 'Listes de tâches, rappels et récurrences',
  icon: ListChecks,
  color: '#10b981',
  Page: lazy(() => import('./TodoPage')),
  widgets: [
    {
      id: 'today',
      name: 'Tâches du jour',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
        { w: 4, h: 3 },
      ],
      Component: lazy(() => import('./TodayWidget')),
    },
  ],
  aiActions: todoTools,
}
