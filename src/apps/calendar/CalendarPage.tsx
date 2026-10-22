import type { DateSelectArg, DatesSetArg, EventClickArg, EventContentArg, EventDropArg, EventInput } from '@fullcalendar/core'
import frLocale from '@fullcalendar/core/locales/fr'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Check, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { expandEvent, localDate } from '../../../supabase/functions/_shared/events'
import { zonedParts, zonedToUtc } from '../../../supabase/functions/_shared/zonedTime'
import { useToast } from '../../components/toast'
import { useTimeZone } from '../../data/queries'
import { useLayoutKind } from '../../home/useLayoutKind'
import { useNowMinute } from '../../lib/useNow'
import { newTask, useTodoActions, useTodoData } from '../todo/data'
import { localToday, priorityColor } from '../todo/logic'
import { TaskEditor } from '../todo/TaskEditor'
import type { Task } from '../todo/types'
import { newEvent, useEventActions, useEvents } from './data'
import { EventEditor } from './EventEditor'
import type { CalendarEvent } from './types'

type Editing =
  | { kind: 'event'; event: CalendarEvent; isNew: boolean; occurrenceDate?: string }
  | { kind: 'task'; task: Task; isNew: boolean }
  | null

const VIEW_KEY = 'monhub.calendar.view'
const TASK_DURATION_MS = 30 * 60_000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function readView(mobile: boolean): string {
  try {
    return localStorage.getItem(VIEW_KEY) ?? (mobile ? 'dayGridMonth' : 'timeGridWeek')
  } catch {
    return mobile ? 'dayGridMonth' : 'timeGridWeek'
  }
}


/** Contenu d'une tâche dans le calendrier : case à cocher + titre. */
function TaskContent({ arg }: { arg: EventContentArg }) {
  const done = Boolean(arg.event.extendedProps.done)
  const color = arg.event.extendedProps.priorityColor as string
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden px-1">
      <span
        data-task-check
        role="checkbox"
        aria-checked={done}
        aria-label={`${done ? 'Décocher' : 'Cocher'} « ${arg.event.title} »`}
        className="grid size-4 shrink-0 place-items-center rounded-full border-2"
        style={{ borderColor: color, background: done ? color : undefined }}
      >
        {done && <Check aria-hidden className="size-3 text-white" />}
      </span>
      {arg.timeText && <span className="shrink-0 text-[0.85em] opacity-70">{arg.timeText}</span>}
      <span className={`truncate ${done ? 'line-through opacity-60' : ''}`}>{arg.event.title}</span>
    </span>
  )
}

export default function CalendarPage() {
  const timeZone = useTimeZone()
  const mobile = useLayoutKind() === 'mobile'
  const [params] = useSearchParams()
  const calendarRef = useRef<FullCalendar>(null)
  const events = useEvents()
  const eventActions = useEventActions()
  const { tasks, lists } = useTodoData()
  const todoActions = useTodoActions()
  const toast = useToast()
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const now = useNowMinute()

  // Événements (séries développées) et tâches datées de la période affichée.
  const items = useMemo<EventInput[]>(() => {
    if (!range) return []
    const fromEvents = events.flatMap((event) =>
      expandEvent(event, range.start, range.end, timeZone).map((occurrence) => ({
        id: `${event.id}::${occurrence.date}`,
        title: event.title,
        start: occurrence.start,
        end: occurrence.end,
        allDay: event.all_day,
        backgroundColor: event.color,
        borderColor: event.color,
        editable: !event.recurrence_rule,
        extendedProps: { type: 'event', eventId: event.id, occurrenceDate: occurrence.date, location: event.location },
      })),
    )
    const startDate = localDate(range.start, timeZone)
    const endDate = localDate(range.end, timeZone)
    const fromTasks = tasks
      .filter((task) => !task.parent_id && task.due_date && task.due_date >= startDate && task.due_date <= endDate)
      .map((task) => {
        const [year, month, day] = task.due_date!.split('-').map(Number)
        const start = task.due_time ? zonedToUtc(year, month, day, ...(task.due_time.split(':').map(Number) as [number, number]), timeZone) : null
        const list = lists.find((candidate) => candidate.id === task.list_id)
        return {
          id: `task:${task.id}`,
          title: task.title,
          start: start ?? task.due_date!,
          end: start ? new Date(start.getTime() + TASK_DURATION_MS) : undefined,
          allDay: !start,
          classNames: ['monhub-task'],
          textColor: 'var(--text)',
          borderColor: list?.color ?? 'var(--border)',
          backgroundColor: 'var(--surface)',
          durationEditable: false,
          extendedProps: { type: 'task', taskId: task.id, done: Boolean(task.completed_at), priorityColor: priorityColor(task.priority) },
        } satisfies EventInput
      })
    return [...fromEvents, ...fromTasks]
  }, [range, events, tasks, lists, timeZone])

  const onDatesSet = (arg: DatesSetArg) => {
    setRange((current) =>
      current && current.start.getTime() === arg.start.getTime() && current.end.getTime() === arg.end.getTime() ? current : { start: arg.start, end: arg.end },
    )
    try {
      localStorage.setItem(VIEW_KEY, arg.view.type)
    } catch {
      // Préférence non conservée : sans gravité.
    }
  }

  const onSelect = (arg: DateSelectArg) => {
    calendarRef.current?.getApi().unselect()
    // Un simple clic sur un créneau : rendez-vous d'une heure.
    const end = !arg.allDay && arg.end.getTime() - arg.start.getTime() <= 30 * 60_000 ? new Date(arg.start.getTime() + 3_600_000) : arg.end
    setEditing({ kind: 'event', event: newEvent(arg.start, end, arg.allDay), isNew: true })
  }

  const onEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault()
    const props = arg.event.extendedProps
    if (props.type === 'task') {
      const task = tasks.find((candidate) => candidate.id === props.taskId)
      if (!task) return
      if ((arg.jsEvent.target as HTMLElement).closest('[data-task-check]')) void todoActions.toggleComplete(task)
      else setEditing({ kind: 'task', task, isNew: false })
      return
    }
    const event = events.find((candidate) => candidate.id === props.eventId)
    if (event) setEditing({ kind: 'event', event, isNew: false, occurrenceDate: props.occurrenceDate })
  }

  /** Glisser une tâche change son échéance ; glisser / étirer un événement change ses horaires. */
  const onMove = (arg: EventDropArg | EventResizeDoneArg) => {
    const props = arg.event.extendedProps
    const start = arg.event.start!
    if (props.type === 'task') {
      const task = tasks.find((candidate) => candidate.id === props.taskId)
      if (!task) return arg.revert()
      const p = zonedParts(start, timeZone)
      void todoActions.saveTask({ ...task, due_date: localDate(start, timeZone), due_time: arg.event.allDay ? null : `${pad(p.hour)}:${pad(p.minute)}` })
      return
    }
    const event = events.find((candidate) => candidate.id === props.eventId)
    if (!event || event.recurrence_rule) {
      arg.revert()
      toast('Pour déplacer une série, modifie-la depuis l’événement.', 'info')
      return
    }
    const fallback = arg.event.allDay ? 86_400_000 : new Date(event.end_at).getTime() - new Date(event.start_at).getTime()
    const end = arg.event.end ?? new Date(start.getTime() + (event.all_day === arg.event.allDay ? fallback : arg.event.allDay ? 86_400_000 : 3_600_000))
    void eventActions.saveEvent({ ...event, all_day: arg.event.allDay, start_at: start.toISOString(), end_at: end.toISOString() })
  }

  const addNow = () => {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
    setEditing({ kind: 'event', event: newEvent(start, new Date(start.getTime() + 3_600_000), false), isNew: true })
  }

  return (
    <div className="monhub-calendar mx-auto w-full max-w-6xl px-2 py-3 md:px-6">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        locale={frLocale}
        initialView={readView(mobile)}
        initialDate={params.get('date') ?? undefined}
        headerToolbar={mobile ? { left: 'prev,next', center: 'title', right: 'today' } : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' }}
        footerToolbar={mobile ? { center: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' } : undefined}
        views={{ listMonth: { buttonText: 'Agenda' } }}
        firstDay={1}
        weekNumbers={!mobile}
        weekText="S"
        allDayText="Journée"
        nowIndicator
        height="auto"
        scrollTime="07:30:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        dayMaxEvents
        selectable
        selectMirror
        editable
        longPressDelay={350}
        events={items}
        datesSet={onDatesSet}
        select={onSelect}
        eventClick={onEventClick}
        eventDrop={onMove}
        eventResize={onMove}
        // `true` = rendu par défaut de FullCalendar pour les événements ; les tâches ont leur case à cocher.
        eventContent={(arg) => (arg.event.extendedProps.type === 'task' ? <TaskContent arg={arg} /> : true)}
      />

      <button
        type="button"
        onClick={addNow}
        aria-label="Nouvel événement"
        className="fixed right-5 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-20 grid size-14 place-items-center rounded-full bg-accent text-accent-contrast shadow-soft"
      >
        <Plus aria-hidden className="size-6" />
      </button>

      {editing?.kind === 'event' && (
        <EventEditor
          key={editing.event.id}
          event={editing.event}
          isNew={editing.isNew}
          occurrenceDate={editing.occurrenceDate}
          onClose={() => setEditing(null)}
          onSwitchToTask={
            editing.isNew && lists[0]
              ? (draft) => {
                  const start = new Date(draft.start_at)
                  const p = zonedParts(start, timeZone)
                  setEditing({
                    kind: 'task',
                    isNew: true,
                    task: newTask(lists[0].id, {
                      title: draft.title,
                      due_date: localDate(start, timeZone),
                      due_time: draft.all_day ? null : `${pad(p.hour)}:${pad(p.minute)}`,
                    }),
                  })
                }
              : undefined
          }
        />
      )}
      {editing?.kind === 'task' && (
        <TaskEditor key={editing.task.id} task={editing.task} isNew={editing.isNew} today={localToday(now, timeZone)} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
