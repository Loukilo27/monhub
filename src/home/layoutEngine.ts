import type { GridItem, GridSpec, Layout } from './types'

/**
 * Moteur de disposition de l'accueil : fonctions pures, sans React, testées unitairement.
 * Règle de base : jamais de chevauchement ; si la case visée est occupée, l'élément
 * se place sur l'emplacement libre le plus proche.
 */

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function inBounds(rect: Rect, spec: GridSpec): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= spec.cols && rect.y + rect.h <= spec.rows
}

/** Vrai si le rectangle tient dans la grille de la page sans chevaucher un autre élément. */
export function fits(items: GridItem[], spec: GridSpec, page: number, rect: Rect, ignoreId?: string): boolean {
  if (!inBounds(rect, spec)) return false
  return !items.some((item) => item.id !== ignoreId && item.page === page && overlaps(item, rect))
}

/**
 * Emplacement libre le plus proche de (targetX, targetY) sur une page, ou null si la page est pleine.
 * La distance est mesurée entre coins supérieurs gauches ; à égalité on préfère la ligne la plus haute.
 */
export function findNearestFree(
  items: GridItem[],
  spec: GridSpec,
  page: number,
  size: { w: number; h: number },
  target: { x: number; y: number },
  ignoreId?: string,
): { x: number; y: number } | null {
  let best: { x: number; y: number; distance: number } | null = null
  for (let y = 0; y + size.h <= spec.rows; y++) {
    for (let x = 0; x + size.w <= spec.cols; x++) {
      if (!fits(items, spec, page, { x, y, w: size.w, h: size.h }, ignoreId)) continue
      const distance = (x - target.x) ** 2 + (y - target.y) ** 2
      if (!best || distance < best.distance || (distance === best.distance && y < best.y)) {
        best = { x, y, distance }
      }
    }
  }
  return best && { x: best.x, y: best.y }
}

/** Premier emplacement libre (lecture de gauche à droite, de haut en bas), en commençant par `startPage`. */
export function findFirstFree(
  layout: Layout,
  spec: GridSpec,
  size: { w: number; h: number },
  startPage = 0,
): { page: number; x: number; y: number } | null {
  if (size.w > spec.cols || size.h > spec.rows) return null
  // Page courante, puis les suivantes, puis les précédentes, et enfin une nouvelle page.
  const existing = Math.min(spec.maxPages, Math.max(layout.pageCount, startPage + 1))
  const order = [...Array(existing).keys()].map((offset) => (startPage + offset) % existing)
  if (existing < spec.maxPages) order.push(existing)
  for (const page of order) {
    for (let y = 0; y + size.h <= spec.rows; y++) {
      for (let x = 0; x + size.w <= spec.cols; x++) {
        if (fits(layout.items, spec, page, { x, y, w: size.w, h: size.h })) return { page, x, y }
      }
    }
  }
  return null
}

/** Ajoute un élément au premier emplacement libre. Renvoie null s'il n'y a plus de place. */
export function addItem(
  layout: Layout,
  spec: GridSpec,
  item: Omit<GridItem, 'page' | 'x' | 'y'>,
  startPage = 0,
): Layout | null {
  const spot = findFirstFree(layout, spec, item, startPage)
  if (!spot) return null
  const items = [...layout.items, { ...item, ...spot }]
  return { items, pageCount: Math.max(layout.pageCount, spot.page + 1) }
}

/** Déplace un élément vers la case visée (ou la plus proche libre). Renvoie null si impossible. */
export function moveItem(layout: Layout, spec: GridSpec, id: string, page: number, x: number, y: number): Layout | null {
  const item = layout.items.find((candidate) => candidate.id === id)
  if (!item || page < 0 || page >= spec.maxPages) return null
  const clamped = {
    x: Math.max(0, Math.min(x, spec.cols - item.w)),
    y: Math.max(0, Math.min(y, spec.rows - item.h)),
  }
  const spot = findNearestFree(layout.items, spec, page, item, clamped, id)
  if (!spot) return null
  return {
    items: layout.items.map((candidate) => (candidate.id === id ? { ...candidate, page, ...spot } : candidate)),
    pageCount: Math.max(layout.pageCount, page + 1),
  }
}

/** Change la taille d'un widget en gardant sa position si possible, sinon au plus près sur la même page. */
export function resizeItem(layout: Layout, spec: GridSpec, id: string, w: number, h: number): Layout | null {
  const item = layout.items.find((candidate) => candidate.id === id)
  if (!item || w > spec.cols || h > spec.rows) return null
  const size = { w, h }
  const target = {
    x: Math.min(item.x, spec.cols - w),
    y: Math.min(item.y, spec.rows - h),
  }
  const spot = findNearestFree(layout.items, spec, item.page, size, target, id)
  if (!spot) return null
  return {
    ...layout,
    items: layout.items.map((candidate) => (candidate.id === id ? { ...candidate, ...size, ...spot } : candidate)),
  }
}

export function removeItem(layout: Layout, id: string): Layout {
  return { ...layout, items: layout.items.filter((item) => item.id !== id) }
}

/**
 * Supprime les pages vides en fin de liste (sauf la première) et renumérote les pages
 * vides intermédiaires pour ne pas laisser de trou.
 */
export function compactPages(layout: Layout): Layout {
  const used = [...new Set(layout.items.map((item) => item.page))].sort((a, b) => a - b)
  const renumber = new Map(used.map((page, index) => [page, index]))
  return {
    items: layout.items.map((item) => ({ ...item, page: renumber.get(item.page) ?? 0 })),
    pageCount: Math.max(1, used.length),
  }
}

/**
 * Nettoie une disposition venue du serveur (données anciennes, grille d'une autre taille…) :
 * chaque élément invalide ou en collision est replacé au premier emplacement libre, ou retiré.
 */
export function sanitizeLayout(raw: Partial<Layout> | null | undefined, spec: GridSpec): Layout {
  let layout: Layout = { items: [], pageCount: Math.min(spec.maxPages, Math.max(1, raw?.pageCount ?? 1)) }
  const candidates = Array.isArray(raw?.items) ? raw.items : []
  for (const item of candidates) {
    if (!item || typeof item.id !== 'string' || typeof item.appId !== 'string') continue
    const w = Math.max(1, Math.min(spec.cols, Math.floor(item.w) || 1))
    const h = Math.max(1, Math.min(spec.rows, Math.floor(item.h) || 1))
    const page = Math.max(0, Math.min(spec.maxPages - 1, Math.floor(item.page) || 0))
    const clean: GridItem = { ...item, w, h, page, x: Math.floor(item.x) || 0, y: Math.floor(item.y) || 0 }
    if (fits(layout.items, spec, page, clean)) {
      layout = { items: [...layout.items, clean], pageCount: Math.max(layout.pageCount, page + 1) }
    } else {
      layout = addItem(layout, spec, clean, page) ?? layout
    }
  }
  return layout
}

/**
 * Vue « fenêtre réduite » de la disposition PC : quand la fenêtre est trop étroite pour 10 colonnes,
 * les éléments sont reversés dans l'ordre de lecture sur moins de colonnes, avec autant de lignes
 * que nécessaire (défilement vertical). Purement visuel : la disposition enregistrée ne change pas.
 */
export function reflow(items: GridItem[], cols: number): GridItem[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
  const placed: GridItem[] = []
  const spec: GridSpec = { cols, rows: Number.MAX_SAFE_INTEGER, maxPages: 1 }
  for (const item of sorted) {
    const size = { w: Math.min(item.w, cols), h: item.h }
    for (let y = 0; ; y++) {
      const x = [...Array(cols - size.w + 1).keys()].find((col) => fits(placed, spec, 0, { x: col, y, ...size }))
      if (x !== undefined) {
        placed.push({ ...item, ...size, page: 0, x, y })
        break
      }
    }
  }
  return placed
}
