import { lazy } from 'react'
import { Palette } from 'lucide-react'
import type { MiniApp } from '../types'

export const paintApp: MiniApp = {
  id: 'paint',
  name: 'Mini Paint',
  description: 'Dessin libre et galerie',
  icon: Palette,
  color: '#8b5cf6',
  Page: lazy(() => import('./PaintPage')),
  widgets: [
    {
      id: 'last-drawing',
      name: 'Dernier dessin',
      sizes: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
        { w: 4, h: 3 },
      ],
      Component: lazy(() => import('./LastDrawingWidget')),
    },
  ],
  aiActions: [],
}
