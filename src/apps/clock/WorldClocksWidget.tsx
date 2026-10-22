import { Moon, Sun } from 'lucide-react'
import type { WidgetSize } from '../types'
import { useNowMinute } from '../../lib/useNow'
import { useTimeZone, useWorldClocks } from './alarms'
import { describeOffset, formatZoneTime, isDaytime } from './worldClockInfo'

/** Widget Fuseaux horaires (4×2) : les premières villes enregistrées. */
export default function WorldClocksWidget({ size }: { size: WidgetSize }) {
  const now = useNowMinute()
  const home = useTimeZone()
  const clocks = useWorldClocks().slice(0, size.w >= 4 ? 4 : 2)

  if (clocks.length === 0) {
    return <div className="grid h-full place-items-center p-3 text-center text-[min(9cqh,5cqw)] text-muted">Ajoute des villes dans l’Horloge</div>
  }

  return (
    <ul className="grid h-full gap-[3cqw] p-[5cqh]" style={{ gridTemplateColumns: `repeat(${clocks.length}, minmax(0, 1fr))` }}>
      {clocks.map((clock) => {
        const Icon = isDaytime(now, clock.time_zone) ? Sun : Moon
        return (
          <li key={clock.id} className="flex min-w-0 flex-col justify-center">
            <span className="flex items-center gap-1 truncate text-[min(11cqh,4cqw)] font-medium">
              <Icon aria-hidden className="size-[1em] shrink-0 opacity-70" />
              {clock.label}
            </span>
            <span className="text-[min(30cqh,9cqw)] leading-tight font-light tabular-nums">{formatZoneTime(now, clock.time_zone)}</span>
            <span className="truncate text-[min(9cqh,3.2cqw)] text-muted">{describeOffset(now, clock.time_zone, home)}</span>
          </li>
        )
      })}
    </ul>
  )
}
