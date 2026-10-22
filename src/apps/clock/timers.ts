import { useCallback } from 'react'
import { backend } from '../../data'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import type { Timer } from './types'

export const TIMER_PRESETS = [1, 5, 10, 25]

/** « 1:05:09 », « 4:30 », « 0:07 ». */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** « 25 min », « 1 h 30 », « 45 s ». */
export function describeDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  if (m) return s ? `${m} min ${s} s` : `${m} min`
  return `${s} s`
}

/** Secondes restantes d'un minuteur à un instant donné. */
export function remainingSeconds(timer: Timer, now: number): number {
  if (timer.state === 'running' && timer.ends_at) return Math.max(0, (new Date(timer.ends_at).getTime() - now) / 1000)
  if (timer.state === 'paused' && timer.remaining_seconds != null) return timer.remaining_seconds
  if (timer.state === 'finished') return 0
  return timer.duration_seconds
}

export function useTimers() {
  return useRows<Timer>('timers')
}

export function useTimerActions() {
  const save = useSaveRows<Timer>('timers')
  const remove = useDeleteRows('timers')

  const update = useCallback((timer: Timer) => save.mutateAsync([timer]), [save])

  const start = useCallback(
    async (timer: Timer) => {
      const seconds = timer.state === 'paused' && timer.remaining_seconds ? timer.remaining_seconds : timer.duration_seconds
      const endsAt = new Date(Date.now() + seconds * 1000)
      await update({ ...timer, state: 'running', ends_at: endsAt.toISOString(), remaining_seconds: null })
      await backend.cancelReminders(timer.id)
      // Rappel serveur : sonne même si l'app est fermée.
      await backend.createReminder({
        source: 'clock',
        kind: 'timer',
        refId: timer.id,
        title: 'Minuteur terminé',
        body: timer.label || describeDuration(timer.duration_seconds),
        url: '/app/clock?tab=minuteurs',
        sendAt: endsAt,
      })
    },
    [update],
  )

  const pause = useCallback(
    async (timer: Timer) => {
      await update({ ...timer, state: 'paused', ends_at: null, remaining_seconds: Math.ceil(remainingSeconds(timer, Date.now())) })
      await backend.cancelReminders(timer.id)
    },
    [update],
  )

  const reset = useCallback(
    async (timer: Timer) => {
      await update({ ...timer, state: 'idle', ends_at: null, remaining_seconds: null })
      await backend.cancelReminders(timer.id)
    },
    [update],
  )

  const markFinished = useCallback((timer: Timer) => update({ ...timer, state: 'finished', ends_at: null, remaining_seconds: 0 }), [update])

  const create = useCallback(
    async (durationSeconds: number, label = '', autoStart = true) => {
      const timer: Timer = {
        id: crypto.randomUUID(),
        label,
        duration_seconds: durationSeconds,
        state: 'idle',
        ends_at: null,
        remaining_seconds: null,
      }
      if (autoStart) await start(timer)
      else await update(timer)
      return timer
    },
    [start, update],
  )

  const deleteTimer = useCallback(
    async (timer: Timer) => {
      await backend.cancelReminders(timer.id)
      await remove.mutateAsync([timer.id])
    },
    [remove],
  )

  return { start, pause, reset, markFinished, create, deleteTimer }
}
