import type { WidgetSize } from '../types'
import { formatLongDate, formatTime } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { AnalogClock } from './AnalogClock'

/** Widget Horloge : numérique (2×1, 4×2) ou analogique (2×2). */
export default function ClockWidget({ size }: { size: WidgetSize }) {
  const now = useNowMinute()

  if (size.w === size.h) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[4cqh] p-[6cqh]">
        <AnalogClock date={now} className="min-h-0 w-full flex-1" />
        <span className="text-[9cqh] font-medium text-muted tabular-nums">{formatTime(now)}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center px-[8cqw]">
      <span className="text-[min(42cqh,22cqw)] leading-none font-semibold tabular-nums">{formatTime(now)}</span>
      <span className="mt-[4cqh] truncate text-[min(14cqh,7cqw)] text-muted">{formatLongDate(now)}</span>
    </div>
  )
}
