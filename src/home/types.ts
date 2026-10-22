/** Disposition PC (10×6, une page) ou mobile (4×6, plusieurs pages). Enregistrées séparément. */
export type LayoutKind = 'desktop' | 'mobile'

export interface GridItem {
  id: string
  type: 'shortcut' | 'widget'
  appId: string
  /** Pour un widget : identifiant du widget dans sa mini-appli. */
  widgetId?: string
  page: number
  x: number
  y: number
  w: number
  h: number
}

export interface GridSpec {
  cols: number
  rows: number
  /** Nombre maximum de pages (1 sur PC). */
  maxPages: number
}

export interface Layout {
  items: GridItem[]
  pageCount: number
}

export const GRID_SPECS: Record<LayoutKind, GridSpec> = {
  desktop: { cols: 10, rows: 6, maxPages: 1 },
  mobile: { cols: 4, rows: 6, maxPages: 10 },
}

export const EMPTY_LAYOUT: Layout = { items: [], pageCount: 1 }
