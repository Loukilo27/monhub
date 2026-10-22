import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, Check, GripVertical, ListTree, Repeat } from 'lucide-react'
import type { CSSProperties, HTMLAttributes } from 'react'
import { describeDue, isOverdue, priorityColor } from './logic'
import type { Tag, Task, TodoList } from './types'

interface TaskRowProps {
  task: Task
  today: string
  nowTime: string
  tags: Tag[]
  subtasks: Task[]
  list?: TodoList
  onToggle: () => void
  onOpen: () => void
  dragHandle?: HTMLAttributes<HTMLButtonElement>
  style?: CSSProperties
  rowRef?: (element: HTMLLIElement | null) => void
  dragging?: boolean
}

export function TaskRow({ task, today, nowTime, tags, subtasks, list, onToggle, onOpen, dragHandle, style, rowRef, dragging }: TaskRowProps) {
  const done = Boolean(task.completed_at)
  const overdue = isOverdue(task, today, nowTime)
  const doneSubtasks = subtasks.filter((sub) => sub.completed_at).length
  const color = priorityColor(task.priority)
  const taskTags = tags.filter((tag) => task.tag_ids.includes(tag.id))

  return (
    <li
      ref={rowRef}
      style={style}
      className={`group flex items-start gap-2 rounded-2xl border border-border bg-surface px-2 py-2 shadow-soft ${dragging ? 'z-10 opacity-80 ring-2 ring-accent' : ''}`}
    >
      {dragHandle && (
        <button
          type="button"
          aria-label={`Déplacer « ${task.title} »`}
          className="grid min-h-11 w-6 shrink-0 cursor-grab touch-none place-items-center text-muted opacity-60 group-hover:opacity-100"
          {...dragHandle}
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${done ? 'Décocher' : 'Cocher'} « ${task.title} »`}
        onClick={onToggle}
        className="grid size-11 shrink-0 place-items-center"
      >
        <span
          className="grid size-6 place-items-center rounded-full border-2 transition-colors"
          style={{ borderColor: color, background: done ? color : task.priority < 4 ? `${color}1a` : undefined }}
        >
          {done && <Check aria-hidden className="size-4 text-white" />}
        </span>
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1.5 text-left">
        <span className={`block ${done ? 'text-muted line-through' : ''}`}>{task.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {task.due_date && <span className={overdue ? 'font-medium text-danger' : ''}>{describeDue(task, today)}</span>}
          {task.recurrence_rule && <Repeat aria-label="Récurrente" className="size-3.5" />}
          {task.reminder_offset_minutes !== null && task.due_date && <Bell aria-label="Rappel" className="size-3.5" />}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <ListTree aria-hidden className="size-3.5" />
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
          {taskTags.map((tag) => (
            <span key={tag.id} style={{ color: tag.color }}>
              #{tag.name}
            </span>
          ))}
          {list && (
            <span className="flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full" style={{ background: list.color }} />
              {list.name}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

/** Même ligne, déplaçable au glisser (poignée à gauche, souris, doigt ou clavier). */
export function SortableTaskRow(props: Omit<TaskRowProps, 'dragHandle' | 'style' | 'rowRef' | 'dragging'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id, data: { task: props.task } })
  return (
    <TaskRow
      {...props}
      rowRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      dragHandle={{ ...attributes, ...listeners }}
    />
  )
}
