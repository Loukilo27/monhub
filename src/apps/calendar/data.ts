import { useCallback } from 'react'
import { nextEventReminder } from '../../../supabase/functions/_shared/events'
import { backend } from '../../data'
import { useTimeZone } from '../../data/queries'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import type { CalendarEvent } from './types'

export function newEvent(start: Date, end: Date, allDay: boolean): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    location: '',
    color: '#3b82f6',
    all_day: allDay,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    recurrence_rule: null,
    exception_dates: [],
    reminder_offsets: allDay ? [] : [15],
  }
}

export function useEvents() {
  return useRows<CalendarEvent>('events').data ?? []
}

/** Programme un rappel push par décalage choisi, pour la prochaine occurrence concernée. */
export async function scheduleEventReminders(event: CalendarEvent, timeZone: string) {
  await backend.cancelReminders(event.id)
  const now = new Date()
  const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
  const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
  for (const offset of event.reminder_offsets) {
    const next = nextEventReminder(event, offset, now, timeZone)
    if (!next) continue
    const when = event.all_day ? DAY.format(next.occurrence.start) : `${DAY.format(next.occurrence.start)} à ${TIME.format(next.occurrence.start)}`
    await backend.createReminder({
      source: 'calendar',
      kind: 'event',
      refId: event.id,
      offsetMinutes: offset,
      title: event.title,
      body: [when.charAt(0).toUpperCase() + when.slice(1), event.location].filter(Boolean).join(' · '),
      url: `/app/calendar?date=${next.occurrence.date}`,
      actions: ['snooze'],
      sendAt: next.sendAt,
    })
  }
}

export function useEventActions() {
  const timeZone = useTimeZone()
  const save = useSaveRows<CalendarEvent>('events')
  const remove = useDeleteRows('events')

  const saveEvent = useCallback(
    async (event: CalendarEvent) => {
      await save.mutateAsync([event])
      await scheduleEventReminders(event, timeZone).catch(() => undefined)
    },
    [save, timeZone],
  )

  const deleteEvent = useCallback(
    async (event: CalendarEvent) => {
      await backend.cancelReminders(event.id).catch(() => undefined)
      await remove.mutateAsync([event.id])
    },
    [remove],
  )

  /** Supprime une seule occurrence d'une série. */
  const deleteOccurrence = useCallback(
    (event: CalendarEvent, date: string) => saveEvent({ ...event, exception_dates: [...new Set([...event.exception_dates, date])] }),
    [saveEvent],
  )

  return { saveEvent, deleteEvent, deleteOccurrence }
}
