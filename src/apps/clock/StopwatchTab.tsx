import { Flag, Pause, Play, RotateCcw } from 'lucide-react'
import { useFrameNow } from '../../lib/useNow'
import {
  addLap,
  elapsed,
  formatStopwatch,
  INITIAL_STOPWATCH,
  lapRows,
  pauseStopwatch,
  setStopwatch,
  startStopwatch,
  useStopwatch,
} from './stopwatch'

export function StopwatchTab() {
  const state = useStopwatch()
  const running = state.startedAt !== null
  const now = useFrameNow(running)
  const total = elapsed(state, now)
  const rows = lapRows(state.laps).reverse()
  const currentLap = total - (state.laps.at(-1) ?? 0)

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <p className="text-[min(16vw,6rem)] leading-none font-light tabular-nums" aria-live="off">
        {formatStopwatch(total)}
      </p>
      <div className="flex gap-3">
        {running ? (
          <button
            type="button"
            onClick={() => setStopwatch(addLap(state, Date.now()))}
            className="flex min-h-14 min-w-28 items-center justify-center gap-2 rounded-full bg-surface-2 px-5 font-medium"
          >
            <Flag aria-hidden className="size-5" />
            Tour
          </button>
        ) : (
          <button
            type="button"
            disabled={total === 0}
            onClick={() => setStopwatch(INITIAL_STOPWATCH)}
            className="flex min-h-14 min-w-28 items-center justify-center gap-2 rounded-full bg-surface-2 px-5 font-medium disabled:opacity-40"
          >
            <RotateCcw aria-hidden className="size-5" />
            Réinitialiser
          </button>
        )}
        <button
          type="button"
          onClick={() => setStopwatch(running ? pauseStopwatch(state, Date.now()) : startStopwatch(state, Date.now()))}
          className={`flex min-h-14 min-w-28 items-center justify-center gap-2 rounded-full px-5 font-medium ${running ? 'bg-amber-500 text-white' : 'bg-accent text-accent-contrast'}`}
        >
          {running ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
          {running ? 'Pause' : total ? 'Reprendre' : 'Démarrer'}
        </button>
      </div>

      {(rows.length > 0 || running) && (
        <table className="w-full max-w-md text-sm tabular-nums">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 font-medium">Tour</th>
              <th className="py-2 text-right font-medium">Durée</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.laps.length > 0 && (
              <tr className="text-muted">
                <td className="py-2">{state.laps.length + 1}</td>
                <td className="py-2 text-right">{formatStopwatch(currentLap)}</td>
                <td className="py-2 text-right">{formatStopwatch(total)}</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.index} className={row.best ? 'text-emerald-600 dark:text-emerald-400' : row.worst ? 'text-danger' : ''}>
                <td className="py-2">
                  {row.index}
                  {row.best && <span className="ml-2 text-xs">meilleur</span>}
                  {row.worst && <span className="ml-2 text-xs">plus lent</span>}
                </td>
                <td className="py-2 text-right">{formatStopwatch(row.split)}</td>
                <td className="py-2 text-right">{formatStopwatch(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
