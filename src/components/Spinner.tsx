import { LoaderCircle } from 'lucide-react'

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex justify-center py-16 text-muted">
      <LoaderCircle aria-hidden className="size-6 animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
