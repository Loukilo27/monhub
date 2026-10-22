import type { WidgetSize } from '../types'
import { expandEvent, localDate } from '../../../supabase/functions/_shared/events'
import { addDays } from '../../../supabase/functions/_shared/recurrence'
import { useTimeZone } from '../../data/queries'
import { useNowMinute } from '../../lib/useNow'
import { useEvents } from './data'

/** Widget Prochains rendez-vous (2×2, 4×2) : 14 jours à venir. */
export default function UpcomingWidget({ size }: { size: WidgetSize }) {
  const now = useNowMinute()
  const timeZone = useTimeZone()
  const events = useEvents()
  const horizon = new Date(now.getTime() + 14 * 86_400_000)
  const today = localDate(now, timeZone)
  const tomorrow = addDays(today, 1)
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone })

  const upcoming = events
    .flatMap((event) => expandEvent(event, now, horizon, timeZone).map((occurrence) => ({ event, occurrence })))
    .sort((a, b) => a.occurrence.start.getTime() - b.occurrence.start.getTime())
    .slice(0, size.h * (size.w >= 4 ? 2 : 2) - 1)

  const dayLabel = (date: string, start: Date) => (date === today ? 'Aujourd’hui' : date === tomorrow ? 'Demain' : day.format(start))

  return (
    <div className="flex h-full flex-col p-[max(0.75rem,4cqh)]">
      <p className="mb-1.5 text-sm font-semibold">Prochains rendez-vous</p>
      {upcoming.length === 0 ? (
        <p className="grid flex-1 place-items-center text-sm text-muted">Rien de prévu sur 2 semaines</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
          {upcoming.map(({ event, occurrence }) => (
            <li key={`${event.id}-${occurrence.date}`} className="flex items-stretch gap-2">
              <span aria-hidden className="w-1 shrink-0 rounded-full" style={{ background: event.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{event.title}</span>
                <span className="block truncate text-xs text-muted">
                  {dayLabel(occurrence.date, occurrence.start)}
                  {!event.all_day && ` · ${time.format(occurrence.start)}`}
                  {size.w >= 4 && event.location && ` · ${event.location}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
