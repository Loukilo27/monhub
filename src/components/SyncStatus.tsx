import { CloudOff, RefreshCw } from 'lucide-react'
import { useOnline, usePendingChanges } from '../data/useSync'

/** Pastille discrète : hors-ligne, ou modifications en attente d'envoi. */
export function SyncStatus() {
  const online = useOnline()
  const pending = usePendingChanges()
  if (online && !pending) return null
  const label = pending ? `${pending} modification${pending > 1 ? 's' : ''} en attente` : 'envoi au retour du réseau'
  return (
    <div
      role="status"
      className="fixed right-4 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-30 flex max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-medium shadow-soft ring-1 ring-border"
    >
      {online ? <RefreshCw aria-hidden className="size-4 animate-spin text-accent motion-reduce:animate-none" /> : <CloudOff aria-hidden className="size-4 text-muted" />}
      <span>
        {online ? 'Synchronisation…' : 'Hors-ligne'}
        <span className="text-muted"> · {label}</span>
      </span>
    </div>
  )
}
