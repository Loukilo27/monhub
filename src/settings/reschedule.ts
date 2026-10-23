import { scheduleEventReminders } from '../apps/calendar/data'
import type { CalendarEvent } from '../apps/calendar/types'
import { scheduleAlarmReminder } from '../apps/clock/alarms'
import type { Alarm } from '../apps/clock/types'
import { scheduleTaskReminder } from '../apps/todo/data'
import type { Task } from '../apps/todo/types'
import { backend } from '../data'

/**
 * Reprogramme les rappels push des alarmes, tâches et événements : après un changement de fuseau
 * horaire (une alarme de 7 h sonne à 7 h dans le nouveau fuseau) ou une restauration de sauvegarde.
 * Les minuteurs en cours ne sont pas concernés.
 */
export async function rescheduleReminders(timeZone: string): Promise<void> {
  const [alarms, tasks, events] = await Promise.all([
    backend.listRows<Alarm>('alarms'),
    backend.listRows<Task>('tasks'),
    backend.listRows<CalendarEvent>('events'),
  ])
  for (const alarm of alarms) await scheduleAlarmReminder(alarm, timeZone)
  for (const task of tasks) if (task.reminder_offset_minutes !== null && task.due_date) await scheduleTaskReminder(task, timeZone)
  for (const event of events) if (event.reminder_offsets.length) await scheduleEventReminders(event, timeZone)
}
