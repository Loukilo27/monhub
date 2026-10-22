import { Check } from 'lucide-react'
import type { WidgetSize } from '../types'
import { useTimeZone } from '../../data/queries'
import { useNowMinute } from '../../lib/useNow'
import { useTodoActions, useTodoData } from './data'
import { describeDue, localToday, priorityColor, sortTasks, tasksForView } from './logic'

/** Widget Tâches du jour : cocher directement depuis l'accueil. */
export default function TodayWidget({ size }: { size: WidgetSize }) {
  const now = useNowMinute()
  const today = localToday(now, useTimeZone())
  const { tasks } = useTodoData()
  const { toggleComplete } = useTodoActions()
  const todays = sortTasks(tasksForView(tasks, 'today', today), 'due')
  const max = size.h * (size.w >= 4 ? 2 : 2) + (size.h - 2)
  const shown = todays.slice(0, max)

  return (
    <div className="flex h-full flex-col p-[max(0.75rem,4cqh)]">
      <p className="mb-1 flex items-baseline justify-between text-sm font-semibold">
        Aujourd’hui
        <span className="text-xs font-normal text-muted">{todays.length ? `${todays.length} tâche${todays.length > 1 ? 's' : ''}` : ''}</span>
      </p>
      {shown.length === 0 ? (
        <p className="grid flex-1 place-items-center text-sm text-muted">Rien de prévu 🎉</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {shown.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <button
                type="button"
                data-widget-action
                role="checkbox"
                aria-checked={false}
                aria-label={`Cocher « ${task.title} »`}
                onClick={() => void toggleComplete(task)}
                className="grid size-8 shrink-0 place-items-center"
              >
                <span className="grid size-5 place-items-center rounded-full border-2" style={{ borderColor: priorityColor(task.priority) }}>
                  <Check aria-hidden className="size-3 opacity-0" />
                </span>
              </button>
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              {size.w >= 4 && task.due_date && (
                <span className={`shrink-0 text-xs ${task.due_date < today ? 'text-danger' : 'text-muted'}`}>{describeDue(task, today)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {todays.length > shown.length && <p className="text-xs text-muted">+ {todays.length - shown.length} autre(s)</p>}
    </div>
  )
}
