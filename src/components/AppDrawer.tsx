import { Plus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ALL_WIDGETS, APPS } from '../apps/registry'
import type { MiniApp, WidgetDefinition, WidgetSize } from '../apps/types'
import { AppIcon } from './AppIcon'
import { IconButton } from './IconButton'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
  /** Mode ajout (édition de l'accueil) : un clic pose l'appli ou le widget au lieu de l'ouvrir. */
  onAddShortcut?: (app: MiniApp) => void
  onAddWidget?: (app: MiniApp, widget: WidgetDefinition, size: WidgetSize) => void
}

/** Tiroir listant toutes les mini-applis et, en mode ajout, leurs widgets. */
export function AppDrawer({ open, onClose, onAddShortcut, onAddWidget }: AppDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const adding = Boolean(onAddShortcut)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="app-drawer-title"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-2xl rounded-t-3xl border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-3xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pt-4">
        <h2 id="app-drawer-title" className="text-base font-semibold">
          {adding ? 'Ajouter à l’accueil' : 'Applications'}
        </h2>
        <IconButton label="Fermer" onClick={onClose}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </div>

      {adding && <h3 className="px-5 pt-2 text-sm font-medium text-muted">Raccourcis</h3>}
      <div className="grid grid-cols-4 gap-2 px-3 pt-2 pb-4 sm:grid-cols-6">
        {APPS.map((app) =>
          adding ? (
            <button
              key={app.id}
              type="button"
              onClick={() => onAddShortcut?.(app)}
              aria-label={`Ajouter le raccourci ${app.name}`}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-2xl p-2"
            >
              <span
                className="relative grid size-14 place-items-center rounded-2xl text-white shadow-soft transition-transform group-hover:scale-105"
                style={{ background: `linear-gradient(145deg, ${app.color}, color-mix(in oklab, ${app.color} 70%, black))` }}
              >
                <app.icon aria-hidden className="size-7" />
                <Plus aria-hidden className="absolute -right-1 -bottom-1 size-5 rounded-full bg-accent p-0.5 text-accent-contrast" />
              </span>
              <span className="max-w-20 truncate text-xs font-medium">{app.name}</span>
            </button>
          ) : (
            <AppIcon key={app.id} app={app} onOpen={onClose} />
          ),
        )}
      </div>

      {adding && (
        <>
          <h3 className="px-5 text-sm font-medium text-muted">Widgets</h3>
          <ul className="space-y-2 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            {ALL_WIDGETS.length === 0 && <li className="text-sm text-muted">Aucun widget pour l’instant.</li>}
            {ALL_WIDGETS.map(({ app, widget }) => (
              <li key={`${app.id}.${widget.id}`} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: app.color }}>
                  <app.icon aria-hidden className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{widget.name}</span>
                {widget.sizes.map((size) => (
                  <button
                    key={`${size.w}x${size.h}`}
                    type="button"
                    onClick={() => onAddWidget?.(app, widget, size)}
                    aria-label={`Ajouter le widget ${widget.name} en ${size.w}×${size.h}`}
                    className="min-h-11 min-w-11 rounded-xl border border-border bg-surface px-3 text-sm font-medium hover:border-accent"
                  >
                    {size.w}×{size.h}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </dialog>
  )
}
