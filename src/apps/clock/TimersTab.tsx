import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { inputBase } from '../../components/Modal'
import { useNowSecond } from '../../lib/useNow'
import { describeDuration, formatDuration, remainingSeconds, TIMER_PRESETS, useTimerActions, useTimers } from './timers'
import type { Timer } from './types'

export function TimersTab() {
  const timers = useTimers().data ?? []
  const actions = useTimerActions()
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [label, setLabel] = useState('')
  const custom = hours * 3600 + minutes * 60 + seconds

  const numberField = (name: string, value: number, max: number, onChange: (value: number) => void) => (
    <label className="flex flex-col items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.min(max, Number(event.target.value) || 0)))}
        className="w-20 rounded-2xl bg-surface-2 py-2 text-center text-3xl font-light tabular-nums outline-none focus:ring-2 focus:ring-accent"
      />
      <span className="text-xs text-muted">{name}</span>
    </label>
  )

  return (
    <div className="space-y-6 py-2">
      <section aria-label="Nouveau minuteur" className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap justify-center gap-2">
          {TIMER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => void actions.create(preset * 60, label)}
              className="min-h-11 rounded-full bg-surface-2 px-4 font-medium hover:bg-accent hover:text-accent-contrast"
            >
              {preset} min
            </button>
          ))}
        </div>
        <div className="flex items-start justify-center gap-2">
          {numberField('heures', hours, 23, setHours)}
          <span className="pt-2 text-3xl text-muted">:</span>
          {numberField('minutes', minutes, 59, setMinutes)}
          <span className="pt-2 text-3xl text-muted">:</span>
          {numberField('secondes', seconds, 59, setSeconds)}
        </div>
        <div className="flex gap-2">
          <input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} placeholder="Nom (facultatif)" className={inputBase} />
          <button
            type="button"
            disabled={custom === 0}
            onClick={() => {
              void actions.create(custom, label)
              setLabel('')
            }}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50"
          >
            <Plus aria-hidden className="size-5" />
            Lancer
          </button>
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {timers.map((timer) => (
          <TimerCard key={timer.id} timer={timer} />
        ))}
      </ul>
    </div>
  )
}

function TimerCard({ timer }: { timer: Timer }) {
  const now = useNowSecond()
  const actions = useTimerActions()
  const left = remainingSeconds(timer, now.getTime())
  const progress = timer.duration_seconds ? left / timer.duration_seconds : 0
  const finished = timer.state === 'finished' || (timer.state === 'running' && left <= 0)
  const radius = 44
  const circumference = 2 * Math.PI * radius

  return (
    <li className={`flex items-center gap-4 rounded-3xl border bg-surface p-4 shadow-soft ${finished ? 'border-accent' : 'border-border'}`}>
      <div className="relative grid size-24 shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="text-lg font-medium tabular-nums">{finished ? 'Fini' : formatDuration(left)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{timer.label || describeDuration(timer.duration_seconds)}</p>
        <p className="text-sm text-muted">
          {finished ? 'Terminé' : timer.state === 'running' ? 'En cours' : timer.state === 'paused' ? 'En pause' : 'Prêt'}
        </p>
        <div className="mt-1 flex">
          {timer.state === 'running' && !finished ? (
            <IconButton label="Mettre en pause" onClick={() => void actions.pause(timer)}>
              <Pause aria-hidden className="size-5" />
            </IconButton>
          ) : (
            !finished && (
              <IconButton label={timer.state === 'paused' ? 'Reprendre' : 'Démarrer'} onClick={() => void actions.start(timer)}>
                <Play aria-hidden className="size-5" />
              </IconButton>
            )
          )}
          <IconButton label="Réinitialiser" disabled={timer.state === 'idle'} onClick={() => void actions.reset(timer)}>
            <RotateCcw aria-hidden className="size-5" />
          </IconButton>
          <IconButton label="Supprimer le minuteur" onClick={() => void actions.deleteTimer(timer)}>
            <Trash2 aria-hidden className="size-5" />
          </IconButton>
        </div>
      </div>
    </li>
  )
}
