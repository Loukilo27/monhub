import { Link } from 'react-router'
import type { MiniApp } from '../apps/types'

/** Tuile d'icône façon écran d'accueil Android : icône colorée + nom. */
export function AppIcon({ app, onOpen }: { app: MiniApp; onOpen?: () => void }) {
  const Icon = app.icon
  return (
    <Link
      to={`/app/${app.id}`}
      viewTransition
      onClick={onOpen}
      className="group flex min-h-11 flex-col items-center gap-1.5 rounded-2xl p-2 outline-none"
    >
      <span
        className="grid size-14 place-items-center rounded-2xl text-white shadow-soft transition-transform group-hover:scale-105 group-active:scale-95"
        style={{ background: `linear-gradient(145deg, ${app.color}, color-mix(in oklab, ${app.color} 70%, black))` }}
      >
        <Icon aria-hidden className="size-7" strokeWidth={2} />
      </span>
      <span className="max-w-20 truncate text-xs font-medium">{app.name}</span>
    </Link>
  )
}
