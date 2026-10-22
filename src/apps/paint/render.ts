import { getStroke } from 'perfect-freehand'
import { floodFillMask, hexToRgb } from './floodFill'
import type { PaintDoc, PaintOp, ShapeOp, StrokeOp, TextOp } from './types'

/** Contour perfect-freehand → chemin SVG. */
function svgPath(points: number[][]): string {
  if (!points.length) return ''
  const d = points.reduce(
    (acc, [x0, y0], index, all) => {
      const [x1, y1] = all[(index + 1) % all.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...points[0], 'Q'] as (string | number)[],
  )
  d.push('Z')
  return d.join(' ')
}

export function strokeOutline(op: StrokeOp): Path2D {
  const outline = getStroke(op.points, {
    size: op.size,
    thinning: op.pressure ? 0.6 : 0.5,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: !op.pressure,
    last: true,
  })
  return new Path2D(svgPath(outline))
}

function drawStroke(ctx: CanvasRenderingContext2D, op: StrokeOp) {
  ctx.save()
  ctx.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over'
  ctx.globalAlpha = op.erase ? 1 : op.opacity
  ctx.fillStyle = op.erase ? '#000' : op.color
  if (op.points.length === 1) {
    // Simple clic : un point rond.
    const [x, y] = op.points[0]
    ctx.beginPath()
    ctx.arc(x, y, op.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fill(strokeOutline(op))
  }
  ctx.restore()
}

export function drawShape(ctx: CanvasRenderingContext2D, op: ShapeOp) {
  ctx.save()
  ctx.globalAlpha = op.opacity
  ctx.strokeStyle = op.color
  ctx.fillStyle = op.color
  ctx.lineWidth = op.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const x = Math.min(op.x1, op.x2)
  const y = Math.min(op.y1, op.y2)
  const w = Math.abs(op.x2 - op.x1)
  const h = Math.abs(op.y2 - op.y1)
  if (op.shape === 'line') {
    ctx.moveTo(op.x1, op.y1)
    ctx.lineTo(op.x2, op.y2)
  } else if (op.shape === 'rect') {
    ctx.rect(x, y, w, h)
  } else {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  }
  if (op.filled && op.shape !== 'line') ctx.fill()
  else ctx.stroke()
  ctx.restore()
}

export function drawText(ctx: CanvasRenderingContext2D, op: TextOp) {
  ctx.save()
  ctx.fillStyle = op.color
  ctx.font = `${op.size}px ${op.font}`
  ctx.textBaseline = 'top'
  op.text.split('\n').forEach((line, index) => ctx.fillText(line, op.x, op.y + index * op.size * 1.25))
  ctx.restore()
}

/** Pot de peinture : calculé sur l'image visible (fond + encre), appliqué sur le calque d'encre. */
function applyFill(ink: CanvasRenderingContext2D, background: string, op: { x: number; y: number; color: string }) {
  const { width, height } = ink.canvas
  const composite = document.createElement('canvas')
  composite.width = width
  composite.height = height
  const c = composite.getContext('2d', { willReadFrequently: true })!
  c.fillStyle = background
  c.fillRect(0, 0, width, height)
  c.drawImage(ink.canvas, 0, 0)
  const mask = floodFillMask(c.getImageData(0, 0, width, height).data, width, height, op.x, op.y)
  const image = ink.getImageData(0, 0, width, height)
  const [r, g, b] = hexToRgb(op.color)
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    image.data[i * 4] = r
    image.data[i * 4 + 1] = g
    image.data[i * 4 + 2] = b
    image.data[i * 4 + 3] = 255
  }
  ink.putImageData(image, 0, 0)
}

/** Dessine une opération sur le calque d'encre (transparent). */
export function applyOp(ink: CanvasRenderingContext2D, background: string, op: PaintOp) {
  switch (op.type) {
    case 'stroke':
      return drawStroke(ink, op)
    case 'shape':
      return drawShape(ink, op)
    case 'text':
      return drawText(ink, op)
    case 'fill':
      return applyFill(ink, background, op)
  }
}

/** Rejoue toutes les opérations sur un calque d'encre vide. */
export function replay(ink: CanvasRenderingContext2D, background: string, ops: PaintOp[]) {
  ink.clearRect(0, 0, ink.canvas.width, ink.canvas.height)
  for (const op of ops) applyOp(ink, background, op)
}

/** Image finale (fond + encre), à la taille voulue. */
export function flatten(ink: HTMLCanvasElement, background: string, maxSize?: number): HTMLCanvasElement {
  const scale = maxSize ? Math.min(1, maxSize / Math.max(ink.width, ink.height)) : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ink.width * scale)
  canvas.height = Math.round(ink.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(ink, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Calque d'encre d'un document complet (export depuis la galerie, duplication). */
export function renderDoc(doc: PaintDoc): HTMLCanvasElement {
  const ink = document.createElement('canvas')
  ink.width = doc.width
  ink.height = doc.height
  replay(ink.getContext('2d', { willReadFrequently: true })!, doc.background, doc.ops)
  return ink
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/webp', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export impossible'))), type, quality))
}
