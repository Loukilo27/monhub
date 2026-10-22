import { lazy } from 'react'
import { NotebookPen } from 'lucide-react'
import type { MiniApp } from '../types'
import { notesTools } from './ai'

export const notesApp: MiniApp = {
  id: 'notes',
  name: 'Notes',
  description: 'Notes en texte enrichi',
  icon: NotebookPen,
  color: '#eab308',
  Page: lazy(() => import('./NotesPage')),
  widgets: [
    {
      id: 'preview',
      name: 'Aperçu d’une note',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
        { w: 4, h: 3 },
      ],
      Component: lazy(() => import('./NotePreviewWidget')),
    },
  ],
  aiActions: notesTools,
}
