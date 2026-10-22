import { describe, expect, it } from 'vitest'
import {
  addItem,
  compactPages,
  findNearestFree,
  fits,
  moveItem,
  reflow,
  removeItem,
  resizeItem,
  sanitizeLayout,
} from './layoutEngine'
import { GRID_SPECS, type GridItem, type Layout } from './types'

const desktop = GRID_SPECS.desktop
const mobile = GRID_SPECS.mobile

function item(id: string, x: number, y: number, w = 1, h = 1, page = 0): GridItem {
  return { id, type: w * h > 1 ? 'widget' : 'shortcut', appId: 'clock', page, x, y, w, h }
}

describe('fits', () => {
  const items = [item('a', 0, 0, 2, 2)]

  it('refuse un chevauchement ou un débordement', () => {
    expect(fits(items, desktop, 0, { x: 1, y: 1, w: 1, h: 1 })).toBe(false)
    expect(fits(items, desktop, 0, { x: 9, y: 0, w: 2, h: 1 })).toBe(false)
    expect(fits(items, desktop, 0, { x: 0, y: 5, w: 1, h: 2 })).toBe(false)
  })

  it('accepte une case libre, une autre page, ou l’élément lui-même ignoré', () => {
    expect(fits(items, desktop, 0, { x: 2, y: 0, w: 1, h: 1 })).toBe(true)
    expect(fits(items, mobile, 1, { x: 0, y: 0, w: 1, h: 1 })).toBe(true)
    expect(fits(items, desktop, 0, { x: 1, y: 1, w: 2, h: 2 }, 'a')).toBe(true)
  })
})

describe('findNearestFree', () => {
  it('renvoie la case visée si elle est libre', () => {
    expect(findNearestFree([], desktop, 0, { w: 1, h: 1 }, { x: 4, y: 3 })).toEqual({ x: 4, y: 3 })
  })

  it('choisit la case libre la plus proche si la cible est occupée', () => {
    const items = [item('a', 4, 3)]
    const spot = findNearestFree(items, desktop, 0, { w: 1, h: 1 }, { x: 4, y: 3 })
    expect(spot).not.toBeNull()
    expect(Math.abs(spot!.x - 4) + Math.abs(spot!.y - 3)).toBe(1)
  })

  it('renvoie null quand la page est pleine', () => {
    const full = [...Array(24).keys()].map((index) => item(`i${index}`, index % 4, Math.floor(index / 4)))
    expect(findNearestFree(full, mobile, 0, { w: 1, h: 1 }, { x: 0, y: 0 })).toBeNull()
  })
})

describe('addItem', () => {
  it('place au premier emplacement libre dans l’ordre de lecture', () => {
    const layout: Layout = { items: [item('a', 0, 0)], pageCount: 1 }
    const next = addItem(layout, desktop, { id: 'b', type: 'shortcut', appId: 'notes', w: 1, h: 1 })
    expect(next?.items.at(-1)).toMatchObject({ id: 'b', page: 0, x: 1, y: 0 })
  })

  it('crée une nouvelle page sur mobile quand la page est pleine', () => {
    const full = [...Array(24).keys()].map((index) => item(`i${index}`, index % 4, Math.floor(index / 4)))
    const next = addItem({ items: full, pageCount: 1 }, mobile, { id: 'n', type: 'shortcut', appId: 'notes', w: 1, h: 1 })
    expect(next?.pageCount).toBe(2)
    expect(next?.items.at(-1)).toMatchObject({ page: 1, x: 0, y: 0 })
  })

  it('préfère une page existante avec de la place avant d’en créer une', () => {
    const full = [...Array(24).keys()].map((index) => item(`i${index}`, index % 4, Math.floor(index / 4), 1, 1, 1))
    const next = addItem({ items: full, pageCount: 2 }, mobile, { id: 'n', type: 'shortcut', appId: 'notes', w: 1, h: 1 }, 1)
    expect(next?.items.at(-1)).toMatchObject({ page: 0 })
    expect(next?.pageCount).toBe(2)
  })

  it('renvoie null sur PC quand il n’y a plus de place', () => {
    const big = [item('w', 0, 0, 10, 6)]
    expect(addItem({ items: big, pageCount: 1 }, desktop, { id: 'n', type: 'shortcut', appId: 'x', w: 1, h: 1 })).toBeNull()
  })
})

describe('moveItem', () => {
  const layout: Layout = { items: [item('a', 0, 0), item('b', 1, 0)], pageCount: 1 }

  it('déplace vers une case libre', () => {
    expect(moveItem(layout, desktop, 'a', 0, 5, 5)?.items[0]).toMatchObject({ x: 5, y: 5 })
  })

  it('évite le chevauchement en se plaçant au plus près', () => {
    const moved = moveItem(layout, desktop, 'a', 0, 1, 0)!.items[0]
    expect(moved).not.toMatchObject({ x: 1, y: 0 })
    expect(Math.abs(moved.x - 1) + Math.abs(moved.y)).toBe(1)
  })

  it('ramène dans la grille une cible qui déborde', () => {
    const wide: Layout = { items: [item('w', 0, 0, 4, 2)], pageCount: 1 }
    expect(moveItem(wide, desktop, 'w', 0, 9, 5)?.items[0]).toMatchObject({ x: 6, y: 4 })
  })

  it('peut changer de page sur mobile', () => {
    const next = moveItem(layout, mobile, 'a', 1, 0, 0)
    expect(next?.items[0]).toMatchObject({ page: 1 })
    expect(next?.pageCount).toBe(2)
  })
})

describe('resizeItem', () => {
  it('garde la position quand la nouvelle taille tient', () => {
    const layout: Layout = { items: [item('w', 2, 2, 2, 2)], pageCount: 1 }
    expect(resizeItem(layout, desktop, 'w', 4, 2)?.items[0]).toMatchObject({ x: 2, y: 2, w: 4, h: 2 })
  })

  it('se décale au plus près si la place manque', () => {
    const layout: Layout = { items: [item('w', 0, 0, 2, 2), item('x', 2, 0)], pageCount: 1 }
    const resized = resizeItem(layout, mobile, 'w', 4, 2)!.items[0]
    expect(resized).toMatchObject({ w: 4, h: 2, x: 0 })
    expect(resized.y).toBeGreaterThanOrEqual(1)
  })

  it('refuse une taille plus grande que la grille', () => {
    expect(resizeItem({ items: [item('w', 0, 0)], pageCount: 1 }, mobile, 'w', 5, 1)).toBeNull()
  })
})

describe('removeItem et compactPages', () => {
  it('supprime et retire les pages vides', () => {
    const layout: Layout = { items: [item('a', 0, 0, 1, 1, 0), item('b', 0, 0, 1, 1, 2)], pageCount: 3 }
    const compacted = compactPages(removeItem(layout, 'a'))
    expect(compacted).toEqual({ items: [{ ...item('b', 0, 0), page: 0 }], pageCount: 1 })
  })
})

describe('sanitizeLayout', () => {
  it('replace les éléments en collision et ignore les entrées invalides', () => {
    const raw = { items: [item('a', 0, 0), item('b', 0, 0), { id: 3 } as unknown as GridItem], pageCount: 1 }
    const clean = sanitizeLayout(raw, desktop)
    expect(clean.items).toHaveLength(2)
    expect(clean.items[1]).toMatchObject({ id: 'b', x: 1, y: 0 })
  })

  it('accepte une valeur vide', () => {
    expect(sanitizeLayout(null, mobile)).toEqual({ items: [], pageCount: 1 })
  })
})

describe('reflow', () => {
  it('reverse les éléments sur moins de colonnes dans l’ordre de lecture', () => {
    const items = [item('a', 0, 0), item('w', 6, 0, 4, 2), item('c', 9, 5)]
    const flowed = reflow(items, 5)
    expect(flowed.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'w', x: 1, y: 0 },
      { id: 'c', x: 0, y: 1 },
    ])
  })

  it('réduit un widget plus large que la grille', () => {
    expect(reflow([item('w', 0, 0, 4, 2)], 3)[0].w).toBe(3)
  })
})
