import { Check, Plus } from 'lucide-react'

/** Barre flottante du mode édition : ajouter des éléments, terminer. */
export function EditBar({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-40 flex justify-center gap-2 px-4">
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-12 items-center gap-2 rounded-full bg-surface px-5 font-medium shadow-soft ring-1 ring-border hover:bg-surface-2"
      >
        <Plus aria-hidden className="size-5" />
        Ajouter
      </button>
      <button
        type="button"
        onClick={onDone}
        className="flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-medium text-accent-contrast shadow-soft"
      >
        <Check aria-hidden className="size-5" />
        Terminé
      </button>
    </div>
  )
}
