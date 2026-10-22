import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** En-tête des pages plein écran (mini-applis, réglages) avec retour à l'accueil. */
export function PageHeader({ title, icon, actions }: { title: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <Link
        to="/"
        viewTransition
        aria-label="Retour à l'accueil"
        title="Retour à l'accueil (Échap)"
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-surface-2"
      >
        <ArrowLeft aria-hidden className="size-5" />
      </Link>
      {icon}
      <h1 className="flex-1 truncate py-3 text-lg font-semibold">{title}</h1>
      {actions}
    </header>
  )
}
