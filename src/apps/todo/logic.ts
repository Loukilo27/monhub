import { addDays, nextOccurrence, parseRRule } from '../../../supabase/functions/_shared/recurrence'
import { zonedParts, zonedToUtc } from '../../../supabase/functions/_shared/zonedTime'
import { formatClockTime } from '../../lib/time'
import type { Task, TaskSort, TodoView } from './types'

/** Heure retenue pour le rappel d'une tâche datée sans heure. */
export const DEFAULT_REMINDER_TIME = '09:00'

export const PRIORITIES = [
  { value: 1, label: 'Urgente', color: '#ef4444' },
  { value: 2, label: 'Haute', color: '#f97316' },
  { value: 3, label: 'Moyenne', color: '#3b82f6' },
  { value: 4, label: 'Aucune', color: '#94a3b8' },
] as const

export function priorityColor(priority: number): string {
  return PRIORITIES.find((item) => item.value === priority)?.color ?? '#94a3b8'
}

/** Date locale du jour « AAAA-MM-JJ » dans le fuseau donné. */
export function localToday(now: Date, timeZone: string): string {
  const p = zonedParts(now, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function isOverdue(task: Task, today: string, nowTime: string): boolean {
  if (task.completed_at || !task.due_date) return false
  if (task.due_date < today) return true
  return task.due_date === today && task.due_time !== null && task.due_time < nowTime
}

/** Tâches principales (hors sous-tâches) correspondant à une vue. */
export function tasksForView(tasks: Task[], view: TodoView, today: string, nowTime = '00:00'): Task[] {
  const top = tasks.filter((task) => !task.parent_id)
  if (view === 'completed') return top.filter((task) => task.completed_at)
  const open = top.filter((task) => !task.completed_at)
  if (view === 'today') return open.filter((task) => task.due_date !== null && task.due_date <= today)
  if (view === 'upcoming') return open.filter((task) => task.due_date !== null && task.due_date > today)
  if (view === 'overdue') return open.filter((task) => isOverdue(task, today, nowTime))
  if (view === 'all') return open
  if ('listId' in view) return open.filter((task) => task.list_id === view.listId)
  return open.filter((task) => task.tag_ids.includes(view.tagId))
}

export interface TaskFilters {
  query: string
  priorities: number[]
  tagId: string | null
  listId: string | null
  /** Échéance : toutes, sans date, aujourd'hui, 7 prochains jours. */
  due: 'any' | 'none' | 'today' | 'week'
}

export const NO_FILTERS: TaskFilters = { query: '', priorities: [], tagId: null, listId: null, due: 'any' }

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function filterTasks(tasks: Task[], filters: TaskFilters, today: string): Task[] {
  const needle = normalize(filters.query.trim())
  const weekEnd = addDays(today, 7)
  return tasks.filter((task) => {
    if (needle && !normalize(`${task.title} ${task.notes}`).includes(needle)) return false
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false
    if (filters.tagId && !task.tag_ids.includes(filters.tagId)) return false
    if (filters.listId && task.list_id !== filters.listId) return false
    if (filters.due === 'none' && task.due_date) return false
    if (filters.due === 'today' && task.due_date !== today) return false
    if (filters.due === 'week' && (!task.due_date || task.due_date < today || task.due_date > weekEnd)) return false
    return true
  })
}

/** Clé de tri par échéance : sans date en dernier, heure facultative. */
function dueKey(task: Task): string {
  return task.due_date ? `${task.due_date} ${task.due_time ?? '99:99'}` : '9999'
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks]
  switch (sort) {
    case 'manual':
      return sorted.sort((a, b) => a.position - b.position)
    case 'due':
      return sorted.sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || a.priority - b.priority)
    case 'priority':
      return sorted.sort((a, b) => a.priority - b.priority || dueKey(a).localeCompare(dueKey(b)))
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
    case 'created':
      return sorted.reverse()
  }
}

/** Position entre deux voisins pour un réordonnancement (glisser-déposer). */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 0
  if (before === undefined) return after! - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** « Aujourd’hui 14:00 », « Demain », « Hier », « lun. 26 oct. ». */
export function describeDue(task: Pick<Task, 'due_date' | 'due_time'>, today: string): string {
  if (!task.due_date) return ''
  const day =
    task.due_date === today
      ? 'Aujourd’hui'
      : task.due_date === addDays(today, 1)
        ? 'Demain'
        : task.due_date === addDays(today, -1)
          ? 'Hier'
          : SHORT_DATE.format(new Date(`${task.due_date}T12:00:00Z`))
  return task.due_time ? `${day} ${formatClockTime(task.due_time)}` : day
}

/** Instant du rappel d'une tâche, ou null (pas de rappel, pas d'échéance). */
export function reminderTime(task: Task, timeZone: string): Date | null {
  if (task.reminder_offset_minutes === null || !task.due_date || task.completed_at) return null
  const [year, month, day] = task.due_date.split('-').map(Number)
  const [hour, minute] = (task.due_time ?? DEFAULT_REMINDER_TIME).split(':').map(Number)
  return new Date(zonedToUtc(year, month, day, hour, minute, timeZone).getTime() - task.reminder_offset_minutes * 60_000)
}

/**
 * Tâche récurrente cochée : prochaine occurrence (nouvelle tâche non faite), ou null si la série
 * est finie. Sans échéance, la série part d'aujourd'hui.
 */
export function nextRecurringTask(task: Task, today: string, newId: string): Task | null {
  const rule = parseRRule(task.recurrence_rule)
  if (!rule) return null
  const base = task.due_date ?? today
  const next = nextOccurrence(rule, base, base)
  if (!next) return null
  return { ...task, id: newId, due_date: next, completed_at: null }
}

export const REMINDER_CHOICES = [
  { value: null, label: 'Pas de rappel' },
  { value: 0, label: 'À l’échéance' },
  { value: 5, label: '5 min avant' },
  { value: 15, label: '15 min avant' },
  { value: 30, label: '30 min avant' },
  { value: 60, label: '1 h avant' },
  { value: 120, label: '2 h avant' },
  { value: 1440, label: '1 jour avant' },
  { value: 2880, label: '2 jours avant' },
  { value: 10080, label: '1 semaine avant' },
] as const
