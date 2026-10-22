import { lazy } from 'react'
import { NotebookPen } from 'lucide-react'
import type { MiniApp } from '../types'

export const notesApp: MiniApp = {
  id: 'notes',
  name: 'Notes',
  description: 'Notes en texte enrichi',
  icon: NotebookPen,
  color: '#eab308',
  Page: lazy(() => import('./NotesPage')),
  widgets: [],
  aiActions: [],
}
