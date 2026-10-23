import { useCallback } from 'react'
import { nextAlarmOccurrence } from '../../../supabase/functions/_shared/zonedTime'
import { backend } from '../../data'
import { formatClockTime } from '../../lib/time'
import { useTimeZone } from '../../data/queries'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import type { Alarm, WorldClock } from './types'

const SHORT_DAYS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const DAY_INITIALS = ['', 'L', 'M', 'M', 'J', 'V', 'S', 'D']
export const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** « Une fois », « Tous les jours », « En semaine », « Week-end » ou « Lun, Mer, Ven ». */
export function describeDays(days: number[]): string {
  const sorted = [...new Set(days)].sort()
  if (sorted.length === 0) return 'Une fois'
  if (sorted.length === 7) return 'Tous les jours'
  if (sorted.join() === '1,2,3,4,5') return 'En semaine'
  if (sorted.join() === '6,7') return 'Week-end'
  return sorted.map((day) => SHORT_DAYS[day]).join(', ')
}

/** « dans 7 h 12 min », « dans 3 min », « dans moins d’une minute ». */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 1) return 'dans moins d’une minute'
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = [days && `${days} j`, hours && `${hours} h`, minutes && `${minutes} min`].filter(Boolean)
  return `dans ${parts.join(' ')}`
}

/** Prochaine alarme active, toutes alarmes confondues. */
export function findNextAlarm(alarms: Alarm[], now: Date, timeZone: string): { alarm: Alarm; at: Date } | null {
  let best: { alarm: Alarm; at: Date } | null = null
  for (const alarm of alarms) {
    if (!alarm.enabled) continue
    const at = nextAlarmOccurrence(alarm, now, timeZone)
    if (!best || at < best.at) best = { alarm, at }
  }
  return best
}

export { useTimeZone } from '../../data/queries'

/** Villes des fuseaux horaires, dans l'ordre choisi. */
export function useWorldClocks(): WorldClock[] {
  const clocks = useRows<WorldClock>('world_clocks').data ?? []
  return [...clocks].sort((a, b) => a.position - b.position)
}

export function useAlarms() {
  return useRows<Alarm>('alarms')
}

/** Programme (ou annule) le rappel serveur de la prochaine sonnerie : push même app fermée. */
export async function scheduleAlarmReminder(alarm: Alarm, timeZone: string) {
  await backend.cancelReminders(alarm.id)
  if (!alarm.enabled) return
  await backend.createReminder({
    source: 'clock',
    kind: 'alarm',
    refId: alarm.id,
    title: alarm.label || 'Alarme',
    body: `Il est ${formatClockTime(alarm.time)}`,
    url: '/app/clock?tab=alarmes',
    actions: ['snooze'],
    sendAt: nextAlarmOccurrence(alarm, new Date(), timeZone),
  })
}

export function useAlarmActions() {
  const timeZone = useTimeZone()
  const save = useSaveRows<Alarm>('alarms')
  const remove = useDeleteRows('alarms')

  const saveAlarm = useCallback(
    async (alarm: Alarm) => {
      await save.mutateAsync([alarm])
      await scheduleAlarmReminder(alarm, timeZone)
    },
    [save, timeZone],
  )

  const deleteAlarm = useCallback(
    async (alarm: Alarm) => {
      await backend.cancelReminders(alarm.id)
      await remove.mutateAsync([alarm.id])
    },
    [remove],
  )

  return { saveAlarm, deleteAlarm }
}

export function newAlarm(): Alarm {
  return { id: crypto.randomUUID(), time: '07:00', label: '', days: [1, 2, 3, 4, 5], sound: 'carillon', snooze_minutes: 10, enabled: true }
}
