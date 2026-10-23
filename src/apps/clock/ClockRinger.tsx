import { AlarmClock, Hourglass } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { nextAlarmOccurrence } from '../../../supabase/functions/_shared/zonedTime'
import type { AppNotification } from '../../data/backend'
import { backend } from '../../data'
import { useRowsRealtime } from '../../data/rows'
import { formatClockTime } from '../../lib/time'
import { useAlarms, useTimeZone } from './alarms'
import { playSound, timerSoundId, unlockAudioOnFirstGesture } from './sounds'
import { describeDuration, useTimerActions, useTimers } from './timers'
import type { Alarm, Timer } from './types'

/** Événement émis quand une notification d'alarme ou de minuteur arrive en temps réel (autre appareil, serveur). */
export const RING_EVENT = 'monhub:ring'

/** Une sonnerie en retard de plus de 5 minutes (veille, onglet fermé) n'est plus jouée. */
const MAX_LATE_MS = 5 * 60_000
/** Évite de faire sonner deux fois le même élément (sonnerie locale + notification serveur). */
const DEDUPE_MS = 3 * 60_000

type Ring =
  | { kind: 'alarm'; refId: string; alarm: Alarm; title: string; subtitle: string; sound: string }
  | { kind: 'timer'; refId: string; timer: Timer; title: string; subtitle: string; sound: string }

/**
 * Toujours monté quand l'app est ouverte : fait sonner alarmes et minuteurs à l'heure exacte,
 * avec un écran plein et la sonnerie choisie. Le serveur, lui, envoie le push (app fermée).
 */
export function ClockRinger() {
  useRowsRealtime(['alarms', 'timers', 'world_clocks'])
  const alarms = useAlarms().data
  const timers = useTimers().data
  const timeZone = useTimeZone()
  const timerActions = useTimerActions()
  const [ringing, setRinging] = useState<Ring | null>(null)
  const lastCheck = useRef<number | null>(null)
  const recentlyRung = useRef(new Map<string, number>())
  const snoozes = useRef<{ alarm: Alarm; at: number }[]>([])

  useEffect(() => unlockAudioOnFirstGesture(), [])

  const ring = useCallback((next: Ring) => {
    const now = Date.now()
    if ((recentlyRung.current.get(next.refId) ?? 0) > now - DEDUPE_MS) return
    recentlyRung.current.set(next.refId, now)
    setRinging(next)
    // Le serveur enregistre la notification, prévient les autres appareils et reprogramme la suite.
    void backend.dispatchNow().catch(() => undefined)
  }, [])

  const alarmRing = useCallback(
    (alarm: Alarm): Ring => ({
      kind: 'alarm',
      refId: alarm.id,
      alarm,
      title: alarm.label || 'Alarme',
      subtitle: formatClockTime(alarm.time),
      sound: alarm.sound,
    }),
    [],
  )

  const timerRing = useCallback(
    (timer: Timer): Ring => ({
      kind: 'timer',
      refId: timer.id,
      timer,
      title: 'Minuteur terminé',
      subtitle: timer.label || describeDuration(timer.duration_seconds),
      sound: timerSoundId(),
    }),
    [],
  )

  // Vérification chaque seconde des échéances.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const from = Math.max(lastCheck.current ?? now, now - MAX_LATE_MS)
      lastCheck.current = now

      for (const alarm of alarms ?? []) {
        if (!alarm.enabled) continue
        const at = nextAlarmOccurrence(alarm, new Date(from - 1), timeZone).getTime()
        if (at <= now) ring(alarmRing(alarm))
      }
      for (const timer of timers ?? []) {
        if (timer.state !== 'running' || !timer.ends_at) continue
        const endsAt = new Date(timer.ends_at).getTime()
        if (endsAt > now) continue
        void timerActions.markFinished(timer)
        if (endsAt >= now - MAX_LATE_MS) ring(timerRing(timer))
      }
      const due = snoozes.current.filter((snooze) => snooze.at <= now)
      if (due.length) {
        snoozes.current = snoozes.current.filter((snooze) => snooze.at > now)
        due.forEach((snooze) => ring(alarmRing(snooze.alarm)))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [alarms, timers, timeZone, ring, alarmRing, timerRing, timerActions])

  // Sonnerie déclenchée ailleurs (autre appareil, rappel reporté depuis une notification…).
  useEffect(() => {
    const onRing = (event: Event) => {
      const notification = (event as CustomEvent<AppNotification>).detail
      const alarm = alarms?.find((candidate) => candidate.id === notification.refId)
      const timer = timers?.find((candidate) => candidate.id === notification.refId)
      if (alarm) ring(alarmRing(alarm))
      else if (timer) ring(timerRing(timer))
    }
    window.addEventListener(RING_EVENT, onRing)
    return () => window.removeEventListener(RING_EVENT, onRing)
  }, [alarms, timers, ring, alarmRing, timerRing])

  if (!ringing) return null

  const snooze = () => {
    if (ringing.kind !== 'alarm') return
    const minutes = ringing.alarm.snooze_minutes
    const at = Date.now() + minutes * 60_000
    snoozes.current.push({ alarm: ringing.alarm, at })
    recentlyRung.current.delete(ringing.refId)
    void backend
      .createReminder({
        source: 'clock',
        kind: 'alarm',
        refId: ringing.alarm.id,
        snoozed: true,
        title: ringing.title,
        body: `Reportée de ${minutes} min`,
        url: '/app/clock?tab=alarmes',
        actions: ['snooze'],
        sendAt: new Date(at),
      })
      .catch(() => undefined)
    setRinging(null)
  }

  const stop = () => {
    if (ringing.kind === 'timer') void timerActions.reset(ringing.timer)
    setRinging(null)
  }

  const addMinute = () => {
    if (ringing.kind !== 'timer') return
    recentlyRung.current.delete(ringing.refId)
    void timerActions.start({ ...ringing.timer, state: 'paused', remaining_seconds: 60 })
    setRinging(null)
  }

  return <RingingScreen ring={ringing} onStop={stop} onSnooze={ringing.kind === 'alarm' ? snooze : undefined} onAddMinute={ringing.kind === 'timer' ? addMinute : undefined} />
}

function RingingScreen({ ring, onStop, onSnooze, onAddMinute }: {
  ring: Ring
  onStop: () => void
  onSnooze?: () => void
  onAddMinute?: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    const stopSound = playSound(ring.sound)
    const vibrate = () => navigator.vibrate?.([600, 300, 600, 300, 600])
    vibrate()
    const vibration = setInterval(vibrate, 3000)
    // Coupe automatiquement au bout de 5 minutes.
    const autoStop = setTimeout(onStop, 5 * 60_000)
    return () => {
      stopSound()
      clearInterval(vibration)
      clearTimeout(autoStop)
      navigator.vibrate?.(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring.refId])

  const Icon = ring.kind === 'alarm' ? AlarmClock : Hourglass

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ringing-title"
      onCancel={(event) => {
        event.preventDefault()
        onStop()
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-gradient-to-b from-indigo-600 to-violet-800 p-0 text-white backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-[env(safe-area-inset-bottom)] text-center">
        <Icon aria-hidden className="size-16 animate-bounce motion-reduce:animate-none" />
        <h2 id="ringing-title" className="text-3xl font-semibold">
          {ring.title}
        </h2>
        <p className="text-6xl font-light tabular-nums">{ring.subtitle}</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {onSnooze && ring.kind === 'alarm' && (
            <button type="button" onClick={onSnooze} className="min-h-14 rounded-full bg-white/20 text-lg font-medium hover:bg-white/30">
              Reporter {ring.alarm.snooze_minutes} min
            </button>
          )}
          {onAddMinute && (
            <button type="button" onClick={onAddMinute} className="min-h-14 rounded-full bg-white/20 text-lg font-medium hover:bg-white/30">
              +1 minute
            </button>
          )}
          <button type="button" autoFocus onClick={onStop} className="min-h-14 rounded-full bg-white text-lg font-semibold text-indigo-700">
            Arrêter
          </button>
        </div>
      </div>
    </dialog>
  )
}
