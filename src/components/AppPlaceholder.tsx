import { Construction } from 'lucide-react'

/** Page provisoire d'une mini-appli pas encore construite. */
export function AppPlaceholder({ phase, features }: { phase: number; features: string[] }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Construction aria-hidden className="size-8" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">En construction</h2>
        <p className="mt-1 text-sm text-muted">Cette mini-appli arrive à la phase {phase}.</p>
      </div>
      <ul className="w-full space-y-2 text-left text-sm">
        {features.map((feature) => (
          <li key={feature} className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
