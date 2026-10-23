import { AlarmClock } from 'lucide-react'
import { useState } from 'react'
import { formatClockTime, hourCycle } from '../../lib/time'
import { useNowSecond } from '../../lib/useNow'
import { AnalogClock } from './AnalogClock'
import { findNextAlarm, formatCountdown, useAlarms, useTimeZone } from './alarms'

type Face = 'analog' | 'digital'
const FACE_KEY = 'monhub.clock.face'

function readFace(): Face {
  try {
    return localStorage.getItem(FACE_KEY) === 'digital' ? 'digital' : 'analog'
  } catch {
    return 'analog'
  }
}

export function MainClockTab() {
  const now = useNowSecond()
  const timeZone = useTimeZone()
  const [face, setFace] = useState<Face>(readFace)
  const next = findNextAlarm(useAlarms().data ?? [], now, timeZone)

  const chooseFace = (value: Face) => {
    setFace(value)
    try {
      localStorage.setItem(FACE_KEY, value)
    } catch {
      // Préférence non conservée : sans gravité.
    }
  }

  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: hourCycle(), timeZone }).format(now)
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(now)

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div role="radiogroup" aria-label="Type d’horloge" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ['analog', 'Analogique'],
            ['digital', 'Numérique'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={face === value}
            onClick={() => chooseFace(value)}
            className="min-h-11 rounded-lg px-4 text-sm font-medium aria-checked:bg-surface aria-checked:shadow-soft"
          >
            {label}
          </button>
        ))}
      </div>

      {face === 'analog' ? (
        <AnalogClock date={now} timeZone={timeZone} showSeconds className="size-[min(70vw,22rem)]" />
      ) : (
        <p className="text-[min(18vw,7rem)] leading-none font-semibold tracking-tight tabular-nums">{time}</p>
      )}
      <p className="text-lg first-letter:uppercase">{date}</p>
      {face === 'analog' && <p className="text-3xl font-medium tabular-nums">{time}</p>}

      {next && (
        <p className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm text-muted">
          <AlarmClock aria-hidden className="size-4" />
          Prochaine alarme à {formatClockTime(next.alarm.time)}
          {next.alarm.label && ` (${next.alarm.label})`} — {formatCountdown(next.at.getTime() - now.getTime())}
        </p>
      )}
    </div>
  )
}
