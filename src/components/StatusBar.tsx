import { Settings, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatLongDate, formatTime } from '../lib/time'
import { useNowMinute } from '../lib/useNow'
import { NotificationBell } from '../notifications/NotificationBell'
import { useAssistantPanel } from '../assistant/useAssistantPanel'
import { IconButton } from './IconButton'
import { ThemeToggle } from './ThemeToggle'

/** Barre d'état discrète en haut de l'accueil. */
export function StatusBar({ editAction }: { editAction?: ReactNode }) {
  const now = useNowMinute()
  const assistant = useAssistantPanel()
  return (
    <header className="home-label flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-1">
      <div className="flex items-baseline gap-3 pl-2">
        <time dateTime={now.toISOString()} className="text-lg font-semibold tabular-nums">
          {formatTime(now)}
        </time>
        <span className="hidden text-sm opacity-80 sm:inline">{formatLongDate(now)}</span>
      </div>
      <nav aria-label="Barre d'état" className="flex items-center text-[color:inherit] [&_button]:text-[color:inherit]">
        {editAction}
        <IconButton label="Assistant (Ctrl+K)" onClick={assistant.open}>
          <Sparkles aria-hidden className="size-5" />
        </IconButton>
        <NotificationBell />
        <ThemeToggle />
        <Link
          to="/settings"
          viewTransition
          aria-label="Réglages"
          title="Réglages"
          className="grid size-11 place-items-center rounded-full transition-colors hover:bg-surface-2/60"
        >
          <Settings aria-hidden className="size-5" />
        </Link>
      </nav>
    </header>
  )
}
