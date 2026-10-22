import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getWidget } from '../apps/registry'
import { useElementSize } from '../lib/useElementSize'
import { EditBadges, GridItemContent, GridItemLink } from './GridItemView'
import { findNearestFree, moveItem, reflow, removeItem } from './layoutEngine'
import { ResizeMenu } from './ResizeMenu'
import { GRID_SPECS, type GridItem, type Layout, type LayoutKind } from './types'

/** Largeur minimale d'une case sur PC avant de passer en vue « fenêtre réduite ». */
const MIN_DESKTOP_CELL = 84
const LONG_PRESS_MS = 450
const DRAG_THRESHOLD = 6
const EDGE_ZONE = 28
const EDGE_DELAY_MS = 650

interface DragState {
  id: string
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  /** Décalage du pointeur par rapport au coin de l'élément, en pixels et en cases. */
  offsetX: number
  offsetY: number
  grabCol: number
  grabRow: number
  width: number
  height: number
  active: boolean
}

interface Target {
  page: number
  x: number
  y: number
}

interface HomeGridProps {
  kind: LayoutKind
  layout: Layout
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onChange: (layout: Layout) => void
  onPageChange?: (page: number) => void
}

export function HomeGrid({ kind, layout, editing, onEditingChange, onChange, onPageChange }: HomeGridProps) {
  const spec = GRID_SPECS[kind]
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const size = useElementSize(containerRef)

  const [currentPage, setCurrentPage] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [resizing, setResizing] = useState<GridItem | null>(null)
  const suppressClick = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Fenêtre de PC trop étroite : les éléments sont réorganisés sur moins de colonnes (lecture seule).
  const reflowCols = kind === 'desktop' && size.width > 0 ? Math.max(4, Math.min(10, Math.floor(size.width / MIN_DESKTOP_CELL))) : 10
  const reflowed = kind === 'desktop' && reflowCols < spec.cols
  const flowItems = useMemo(() => (reflowed ? reflow(layout.items, reflowCols) : null), [reflowed, layout.items, reflowCols])

  // En édition sur mobile, une page vide supplémentaire permet d'y déposer des éléments.
  const pageCount = kind === 'mobile' ? Math.min(spec.maxPages, layout.pageCount + (editing ? 1 : 0)) : 1
  const cellWidth = size.width / (reflowed ? reflowCols : spec.cols)
  const cellHeight = size.height / spec.rows
  const compact = cellWidth < 64 || cellHeight < 64

  // ---------- Pages (mobile) ----------

  const scrollToPage = useCallback((page: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ left: page * scroller.clientWidth, behavior: 'smooth' })
  }, [])

  const onScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    const page = Math.round(scroller.scrollLeft / scroller.clientWidth)
    if (page !== currentPage) {
      setCurrentPage(page)
      onPageChange?.(page)
      // Changement de page pendant un glisser : recalculer la case visée sur la nouvelle page.
      if (drag?.active) setTarget(computeTarget(drag, page))
    }
  }

  useEffect(() => {
    if (currentPage >= pageCount) scrollToPage(pageCount - 1)
  }, [currentPage, pageCount, scrollToPage])

  // ---------- Glisser-déposer ----------

  const computeTarget = useCallback(
    (state: DragState, page: number): Target | null => {
      const grid = pageRefs.current[page]
      const item = layout.items.find((candidate) => candidate.id === state.id)
      if (!grid || !item) return null
      const rect = grid.getBoundingClientRect()
      const col = Math.floor((state.x - rect.left) / (rect.width / spec.cols)) - state.grabCol
      const row = Math.floor((state.y - rect.top) / (rect.height / spec.rows)) - state.grabRow
      const clamped = {
        x: Math.max(0, Math.min(col, spec.cols - item.w)),
        y: Math.max(0, Math.min(row, spec.rows - item.h)),
      }
      const spot = findNearestFree(layout.items, spec, page, item, clamped, item.id)
      return spot && { page, ...spot }
    },
    [layout.items, spec],
  )

  const onItemPointerDown = (event: React.PointerEvent<HTMLDivElement>, item: GridItem) => {
    if (!editing || event.button !== 0 || reflowed) return
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX,
      offsetY,
      grabCol: Math.floor(offsetX / (rect.width / item.w)),
      grabRow: Math.floor(offsetY / (rect.height / item.h)),
      width: rect.width,
      height: rect.height,
      active: false,
    })
  }

  const onItemPointerMove = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD
    const next = { ...drag, x: event.clientX, y: event.clientY, active: drag.active || moved }
    setDrag(next)
    if (!next.active) return
    setTarget(computeTarget(next, currentPage))

    // Sur mobile, maintenir l'élément au bord de l'écran fait changer de page.
    if (kind === 'mobile') {
      const width = window.innerWidth
      const direction = event.clientX < EDGE_ZONE ? -1 : event.clientX > width - EDGE_ZONE ? 1 : 0
      if (direction === 0) {
        clearTimeout(edgeTimer.current)
        edgeTimer.current = undefined
      } else if (!edgeTimer.current) {
        edgeTimer.current = setTimeout(() => {
          edgeTimer.current = undefined
          const page = currentPage + direction
          if (page >= 0 && page < pageCount) scrollToPage(page)
        }, EDGE_DELAY_MS)
      }
    }
  }

  const endDrag = (commit: boolean) => {
    clearTimeout(edgeTimer.current)
    edgeTimer.current = undefined
    if (commit && drag?.active && target) {
      const next = moveItem(layout, spec, drag.id, target.page, target.x, target.y)
      if (next) onChange(next)
    }
    setDrag(null)
    setTarget(null)
  }

  // ---------- Appui long / clic droit : passer en mode édition ----------

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = undefined
  }

  const onGridPointerDown = (event: React.PointerEvent) => {
    if (editing || event.pointerType === 'mouse') return
    const startX = event.clientX
    const startY = event.clientY
    cancelLongPress()
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true
      navigator.vibrate?.(15)
      onEditingChange(true)
    }, LONG_PRESS_MS)
    const onMove = (move: PointerEvent) => {
      if (Math.hypot(move.clientX - startX, move.clientY - startY) > 10) cleanup()
    }
    const cleanup = () => {
      cancelLongPress()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
  }

  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    if (!reflowed) onEditingChange(true)
  }

  const onLinkClickCapture = (event: React.MouseEvent) => {
    if (suppressClick.current) {
      event.preventDefault()
      suppressClick.current = false
    }
  }

  // ---------- Clavier (mode édition) ----------

  const onItemKeyDown = (event: React.KeyboardEvent, item: GridItem) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onChange(removeItem(layout, item.id))
      return
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const x = item.x + move[0]
    const y = item.y + move[1]
    if (x < 0 || y < 0 || x + item.w > spec.cols || y + item.h > spec.rows) return
    const next = moveItem(layout, spec, item.id, item.page, x, y)
    if (next) onChange(next)
  }

  // ---------- Rendu ----------

  const placement = (item: GridItem): CSSProperties => ({
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  })

  const renderItem = (item: GridItem) => {
    const isDragged = drag?.active && drag.id === item.id
    if (!editing) {
      return (
        <div key={item.id} style={placement(item)} className="min-h-0 min-w-0 p-1.5" data-testid="home-item">
          <GridItemLink item={item} compact={compact} onClickCapture={onLinkClickCapture} />
        </div>
      )
    }
    const resizable = item.type === 'widget' && (getWidget(item.appId, item.widgetId)?.sizes.length ?? 0) > 1
    return (
      <div
        key={item.id}
        style={{ ...placement(item), animationDelay: `${(item.x * 37 + item.y * 53) % 300}ms` }}
        className={`relative min-h-0 min-w-0 cursor-grab touch-none p-1.5 select-none ${isDragged ? 'opacity-30' : 'jiggle'}`}
        data-testid="home-item"
        tabIndex={0}
        role="button"
        aria-roledescription="élément déplaçable"
        aria-label={`${item.type === 'widget' ? 'Widget' : 'Raccourci'} ${item.appId} — flèches pour déplacer, Suppr pour retirer`}
        onPointerDown={(event) => onItemPointerDown(event, item)}
        onPointerMove={onItemPointerMove}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
        onKeyDown={(event) => onItemKeyDown(event, item)}
      >
        <div className="pointer-events-none h-full w-full">
          <GridItemContent item={item} compact={compact} />
        </div>
        <EditBadges
          item={item}
          onRemove={() => onChange(removeItem(layout, item.id))}
          onResize={resizable ? () => setResizing(item) : undefined}
        />
      </div>
    )
  }

  const gridStyle = (cols: number, rows: number, fixedRowHeight?: number): CSSProperties => ({
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: fixedRowHeight ? `repeat(${rows}, ${fixedRowHeight}px)` : `repeat(${rows}, minmax(0, 1fr))`,
  })

  const draggedItem = drag?.active ? layout.items.find((item) => item.id === drag.id) : undefined

  return (
    <div
      ref={containerRef}
      className={`relative min-h-0 flex-1 select-none [-webkit-touch-callout:none] ${reflowed ? 'overflow-y-auto' : ''}`}
      onContextMenu={onContextMenu}
      onPointerDown={onGridPointerDown}
    >
      {editing && reflowed && (
        <p role="status" className="mx-auto mb-2 w-fit rounded-full bg-surface px-4 py-2 text-sm shadow-soft">
          Agrandis la fenêtre pour modifier la disposition.
        </p>
      )}
      {flowItems ? (
        <div className="grid" style={gridStyle(reflowCols, Math.max(1, ...flowItems.map((item) => item.y + item.h)), cellWidth)}>
          {flowItems.map(renderItem)}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
          {[...Array(pageCount).keys()].map((page) => (
            <div
              key={page}
              ref={(element) => {
                pageRefs.current[page] = element
              }}
              aria-label={kind === 'mobile' ? `Page ${page + 1} sur ${pageCount}` : undefined}
              className={`relative grid h-full w-full shrink-0 snap-start ${editing ? 'rounded-3xl outline-1 -outline-offset-4 outline-border outline-dashed' : ''}`}
              style={gridStyle(spec.cols, spec.rows)}
            >
              {target?.page === page && draggedItem && (
                <div
                  aria-hidden
                  className="m-1.5 rounded-3xl border-2 border-dashed border-accent bg-accent/10"
                  style={placement({ ...draggedItem, ...target })}
                />
              )}
              {layout.items.filter((item) => item.page === page).map(renderItem)}
            </div>
          ))}
        </div>
      )}

      {kind === 'mobile' && pageCount > 1 && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center gap-1.5" aria-hidden>
          {[...Array(pageCount).keys()].map((page) => (
            <span
              key={page}
              className={`size-1.5 rounded-full transition-colors ${page === currentPage ? 'bg-text' : 'bg-text/30'}`}
            />
          ))}
        </div>
      )}

      {draggedItem && drag && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 scale-105 p-1.5 opacity-95 drop-shadow-xl"
          style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, height: drag.height }}
        >
          <GridItemContent item={draggedItem} compact={compact} />
        </div>
      )}

      {resizing && (
        <ResizeMenu
          item={resizing}
          kind={kind}
          layout={layout}
          onClose={() => setResizing(null)}
          onChange={(next) => {
            onChange(next)
            setResizing(null)
          }}
        />
      )}
    </div>
  )
}
