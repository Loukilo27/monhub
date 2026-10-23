import { AlarmClock } from 'lucide-react'
import { formatClockTime } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { DAY_NAMES, findNextAlarm, formatCountdown, useAlarms, useTimeZone } from './alarms'
import { zonedParts } from '../../../supabase/functions/_shared/zonedTime'

/** Widget Prochaine alarme (2×1). */
export default function NextAlarmWidget() {
  const now = useNowMinute()
  const timeZone = useTimeZone()
  const next = findNextAlarm(useAlarms().data ?? [], now, timeZone)

  if (!next) {
    return (
      <div className="flex h-full items-center gap-[4cqw] px-[7cqw] text-muted">
        <AlarmClock aria-hidden className="size-[30cqh] shrink-0" />
        <span className="text-[min(16cqh,8cqw)]">Aucune alarme</span>
      </div>
    )
  }

  const day = DAY_NAMES[zonedParts(next.at, timeZone).weekday]
  return (
    <div className="flex h-full items-center gap-[4cqw] px-[7cqw]">
      <AlarmClock aria-hidden className="size-[30cqh] shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-[min(34cqh,15cqw)] leading-none font-semibold tabular-nums">{formatClockTime(next.alarm.time)}</p>
        <p className="truncate text-[min(13cqh,6.5cqw)] text-muted">
          {next.alarm.label || day} · {formatCountdown(next.at.getTime() - now.getTime())}
        </p>
      </div>
    </div>
  )
}
