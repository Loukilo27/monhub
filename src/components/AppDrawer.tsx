import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { APPS } from '../apps/registry'
import { AppIcon } from './AppIcon'
import { IconButton } from './IconButton'

/**
 * Tiroir d'applications. Pour l'instant il ouvre les mini-applis ; à la phase 3
 * il servira aussi à poser raccourcis et widgets sur la grille d'accueil.
 */
export function AppDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      className="mx-auto mt-auto mb-0 w-full max-w-2xl rounded-t-3xl border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-3xl"
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 id="app-drawer-title" className="text-base font-semibold">
          Applications
        </h2>
        <IconButton label="Fermer" onClick={onClose}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </div>
      <div className="grid grid-cols-4 gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:grid-cols-6">
        {APPS.map((app) => (
          <AppIcon key={app.id} app={app} onOpen={onClose} />
        ))}
      </div>
    </dialog>
  )
}
