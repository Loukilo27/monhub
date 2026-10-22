import { lazy } from 'react'
import { ListChecks } from 'lucide-react'
import type { MiniApp } from '../types'

export const todoApp: MiniApp = {
  id: 'todo',
  name: 'Tâches',
  description: 'Listes de tâches, rappels et récurrences',
  icon: ListChecks,
  color: '#10b981',
  Page: lazy(() => import('./TodoPage')),
  widgets: [],
  aiActions: [],
}
