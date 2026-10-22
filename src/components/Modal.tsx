import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'

/** Boîte de dialogue modale (bas d'écran sur mobile, centrée sur PC). Échap ou clic à l'extérieur la ferme. */
export function Modal({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      className="mx-auto mt-auto mb-0 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-black/40 sm:mb-auto sm:rounded-3xl"
    >
      <header className="flex items-center gap-2 px-5 pt-3">
        <h2 className="flex-1 font-semibold">{title}</h2>
        <IconButton label="Fermer" onClick={() => dialogRef.current?.close()}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </header>
      <div className="overflow-y-auto px-5 pb-4">{children}</div>
      {footer && <footer className="flex gap-2 border-t border-border px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">{footer}</footer>}
    </dialog>
  )
}

export const buttonPrimary =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50'
export const buttonSecondary =
  'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 font-medium hover:bg-surface-2 disabled:opacity-50'
export const inputBase = 'min-h-11 w-full rounded-xl border border-border bg-bg px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'
