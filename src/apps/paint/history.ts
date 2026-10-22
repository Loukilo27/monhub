import type { PaintDoc, PaintOp } from './types'

/** Historique annuler / rétablir : les opérations appliquées et celles annulées. */
export interface History {
  ops: PaintOp[]
  undone: PaintOp[]
}

export const EMPTY_HISTORY: History = { ops: [], undone: [] }

export function push(history: History, op: PaintOp): History {
  return { ops: [...history.ops, op], undone: [] }
}

export function undo(history: History): History {
  if (!history.ops.length) return history
  return { ops: history.ops.slice(0, -1), undone: [...history.undone, history.ops[history.ops.length - 1]] }
}

export function redo(history: History): History {
  if (!history.undone.length) return history
  return { ops: [...history.ops, history.undone[history.undone.length - 1]], undone: history.undone.slice(0, -1) }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/** Document JSON compact (coordonnées au dixième de pixel). */
export function serialize(doc: Omit<PaintDoc, 'format' | 'version'>): string {
  const ops = doc.ops.map((op) =>
    op.type === 'stroke' ? { ...op, points: op.points.map(([x, y, p]) => [round(x), round(y), Math.round(p * 100) / 100]) } : op,
  )
  return JSON.stringify({ format: 'monhub-paint', version: 1, ...doc, ops })
}

export function parseDoc(json: string): PaintDoc {
  const doc = JSON.parse(json) as PaintDoc
  if (doc.format !== 'monhub-paint' || !Array.isArray(doc.ops)) throw new Error('Format de dessin inconnu')
  return doc
}
