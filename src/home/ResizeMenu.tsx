import { useEffect, useRef } from 'react'
import { getApp, getWidget } from '../apps/registry'
import { resizeItem } from './layoutEngine'
import { GRID_SPECS, type GridItem, type Layout, type LayoutKind } from './types'

/** Choix de la taille d'un widget parmi celles qu'il propose. */
export function ResizeMenu({ item, kind, layout, onChange, onClose }: {
  item: GridItem
  kind: LayoutKind
  layout: Layout
  onChange: (layout: Layout) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const spec = GRID_SPECS[kind]
  const widget = getWidget(item.appId, item.widgetId)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      aria-labelledby="resize-title"
      className="m-auto w-full max-w-xs rounded-3xl border border-border bg-surface p-5 text-text shadow-soft backdrop:bg-black/40"
    >
      <h2 id="resize-title" className="font-semibold">
        Taille du widget {widget?.name ?? getApp(item.appId)?.name}
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {widget?.sizes.map((size) => {
          const next = resizeItem(layout, spec, item.id, size.w, size.h)
          const current = size.w === item.w && size.h === item.h
          return (
            <button
              key={`${size.w}x${size.h}`}
              type="button"
              disabled={!next || current}
              aria-pressed={current}
              title={next || current ? undefined : 'Pas assez de place sur cette page'}
              onClick={() => next && onChange(next)}
              className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border border-border p-2 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-40 aria-pressed:border-accent aria-pressed:opacity-100"
            >
              <span
                aria-hidden
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${size.w}, 8px)`, gridTemplateRows: `repeat(${size.h}, 8px)` }}
              >
                {[...Array(size.w * size.h).keys()].map((cell) => (
                  <span key={cell} className="rounded-[2px] bg-accent/60" />
                ))}
              </span>
              {size.w}×{size.h}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        className="mt-4 min-h-11 w-full rounded-xl text-sm font-medium text-muted hover:bg-surface-2"
      >
        Annuler
      </button>
    </dialog>
  )
}
