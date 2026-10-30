import { Check } from 'lucide-react'
import { zonedParts } from '../../../supabase/functions/_shared/zonedTime'
import type { WidgetSize } from '../types'
import { useTimeZone } from '../../data/queries'
import { formatClockTime } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { useTodoActions, useTodoData } from './data'
import { describeDue, isOverdue, localToday, priorityColor, upcomingTasks } from './logic'

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Widget Prochaines tâches (2×2, 4×2, 4×3), présenté comme les prochains rendez-vous de l'agenda :
 * couleur de la liste, titre, échéance. Les tâches en retard d'abord ; on coche depuis l'accueil.
 */
export default function TodayWidget({ size }: { size: WidgetSize }) {
  const now = useNowMinute()
  const timeZone = useTimeZone()
  const today = localToday(now, timeZone)
  const clock = zonedParts(now, timeZone)
  const nowTime = `${pad(clock.hour)}:${pad(clock.minute)}`
  const { tasks, lists } = useTodoData()
  const { toggleComplete } = useTodoActions()
  const upcoming = upcomingTasks(tasks, today)
  const shown = upcoming.slice(0, size.h * 2 - 1)
  const listById = new Map(lists.map((list) => [list.id, list]))

  return (
    <div className="flex h-full flex-col p-[max(0.75rem,4cqh)]">
      <p className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
        Prochaines tâches
        <span className="text-xs font-normal text-muted">{upcoming.length ? `${upcoming.length} tâche${upcoming.length > 1 ? 's' : ''}` : ''}</span>
      </p>
      {shown.length === 0 ? (
        <p className="grid flex-1 place-items-center text-sm text-muted">Rien de prévu sur 2 semaines 🎉</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
          {shown.map((task) => {
            const list = listById.get(task.list_id)
            const late = isOverdue(task, today, nowTime)
            return (
              <li key={task.id} className="flex items-stretch gap-2">
                <span aria-hidden className="w-1 shrink-0 rounded-full" style={{ background: list?.color ?? priorityColor(task.priority) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{task.title}</span>
                  <span className={`block truncate text-xs ${late ? 'text-danger' : 'text-muted'}`}>
                    {late && 'En retard · '}
                    {describeDue({ due_date: task.due_date, due_time: null }, today)}
                    {task.due_time && ` · ${formatClockTime(task.due_time)}`}
                    {size.w >= 4 && list && ` · ${list.name}`}
                  </span>
                </span>
                <button
                  type="button"
                  data-widget-action
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Cocher « ${task.title} »`}
                  onClick={() => void toggleComplete(task)}
                  className="grid size-8 shrink-0 place-items-center self-center"
                >
                  <span className="grid size-5 place-items-center rounded-full border-2" style={{ borderColor: priorityColor(task.priority) }}>
                    <Check aria-hidden className="size-3 opacity-0" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {upcoming.length > shown.length && <p className="text-xs text-muted">+ {upcoming.length - shown.length} autre{upcoming.length - shown.length > 1 ? 's' : ''}</p>}
    </div>
  )
}
