import { describe, expect, it } from 'vitest'
import { floodFillMask, hexToRgb, rgbToHex } from './floodFill'
import { EMPTY_HISTORY, parseDoc, push, redo, serialize, undo } from './history'
import type { FillOp, StrokeOp } from './types'

const stroke = (color: string): StrokeOp => ({ type: 'stroke', erase: false, color, size: 8, opacity: 1, pressure: false, points: [[1.234, 5.678, 0.5]] })
const fill: FillOp = { type: 'fill', x: 1, y: 1, color: '#ff0000' }

describe('annuler / rétablir', () => {
  it('annule puis rétablit dans l’ordre', () => {
    let history = push(push(EMPTY_HISTORY, stroke('#000000')), fill)
    history = undo(history)
    expect(history.ops).toHaveLength(1)
    expect(history.undone).toEqual([fill])
    history = redo(history)
    expect(history.ops.at(-1)).toEqual(fill)
    expect(history.undone).toHaveLength(0)
  })

  it('une nouvelle action efface ce qui pouvait être rétabli', () => {
    const history = push(undo(push(EMPTY_HISTORY, fill)), stroke('#00ff00'))
    expect(history.undone).toHaveLength(0)
    expect(history.ops).toHaveLength(1)
  })

  it('ne fait rien sans historique', () => {
    expect(undo(EMPTY_HISTORY)).toBe(EMPTY_HISTORY)
    expect(redo(EMPTY_HISTORY)).toBe(EMPTY_HISTORY)
  })
})

describe('document JSON', () => {
  it('arrondit les coordonnées et se relit', () => {
    const json = serialize({ width: 100, height: 80, background: '#ffffff', ops: [stroke('#000000'), fill] })
    const doc = parseDoc(json)
    expect(doc).toMatchObject({ format: 'monhub-paint', version: 1, width: 100, height: 80 })
    expect((doc.ops[0] as StrokeOp).points[0]).toEqual([1.2, 5.7, 0.5])
  })

  it('refuse un fichier étranger', () => {
    expect(() => parseDoc('{"hello":1}')).toThrow()
  })
})

describe('pot de peinture', () => {
  // Image 5×5 blanche avec une barre verticale noire en x = 2.
  const width = 5
  const height = 5
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const black = i % width === 2
    pixels.set(black ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4)
  }

  it('remplit la zone contiguë et s’arrête aux bords (plus 1 px de marge)', () => {
    const mask = floodFillMask(pixels, width, height, 0, 0)
    const filled = (x: number, y: number) => mask[y * width + x] === 1
    expect(filled(0, 0) && filled(1, 4)).toBe(true)
    expect(filled(2, 2)).toBe(true) // marge d'un pixel sur la barre
    expect(filled(3, 0) || filled(4, 4)).toBe(false) // de l'autre côté : non
  })

  it('ignore un point hors de l’image', () => {
    expect(floodFillMask(pixels, width, height, -1, 0).some(Boolean)).toBe(false)
  })

  it('convertit les couleurs', () => {
    expect(hexToRgb('#3b82f6')).toEqual([59, 130, 246])
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(rgbToHex(59, 130, 246)).toBe('#3b82f6')
  })
})
