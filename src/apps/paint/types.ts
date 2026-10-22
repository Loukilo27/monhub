/** Ligne de la table drawings. */
export interface Drawing {
  id: string
  title: string
  width: number
  height: number
  background: string
  /** Incrémentée à chaque enregistrement (fait partie du nom des fichiers). */
  version: number
  created_at?: string
  updated_at?: string
}

export type Tool = 'brush' | 'eraser' | 'eyedropper' | 'bucket' | 'line' | 'rect' | 'ellipse' | 'text'

/** Point d'un tracé : x, y et pression (0 à 1). */
export type StrokePoint = [number, number, number]

export interface StrokeOp {
  type: 'stroke'
  /** Gomme : efface l'encre (le fond reste). */
  erase: boolean
  color: string
  size: number
  opacity: number
  /** Pression réelle (stylet) ; sinon simulée d'après la vitesse. */
  pressure: boolean
  points: StrokePoint[]
}

export interface ShapeOp {
  type: 'shape'
  shape: 'line' | 'rect' | 'ellipse'
  color: string
  size: number
  opacity: number
  filled: boolean
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface TextOp {
  type: 'text'
  text: string
  x: number
  y: number
  color: string
  size: number
  font: string
}

export interface FillOp {
  type: 'fill'
  x: number
  y: number
  color: string
}

export type PaintOp = StrokeOp | ShapeOp | TextOp | FillOp

/** Document enregistré (JSON) : tout ce qu'il faut pour reprendre l'édition à l'identique. */
export interface PaintDoc {
  format: 'monhub-paint'
  version: 1
  width: number
  height: number
  background: string
  ops: PaintOp[]
}

export const CANVAS_FORMATS = [
  { id: 'landscape', label: 'Paysage', width: 1600, height: 1000 },
  { id: 'portrait', label: 'Portrait', width: 1000, height: 1600 },
  { id: 'square', label: 'Carré', width: 1200, height: 1200 },
] as const

export const PALETTE = [
  '#111827', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#facc15', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#7c2d12', '#fde68a', '#bbf7d0', '#bfdbfe',
]
