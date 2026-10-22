/** Lignes des tables de la to-do (mêmes noms de colonnes qu'en base). */

export interface TodoList {
  id: string
  name: string
  color: string
  icon: string
  position: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  list_id: string
  parent_id: string | null
  title: string
  notes: string
  /** Date locale « AAAA-MM-JJ ». */
  due_date: string | null
  /** « HH:MM » */
  due_time: string | null
  /** 1 = urgente, 2 = haute, 3 = moyenne, 4 = aucune */
  priority: number
  tag_ids: string[]
  recurrence_rule: string | null
  /** Rappel X minutes avant l'échéance (0 = à l'heure), null = pas de rappel. */
  reminder_offset_minutes: number | null
  position: number
  completed_at: string | null
}

/** Vues automatiques ou liste précise. */
export type TodoView = 'today' | 'upcoming' | 'overdue' | 'all' | 'completed' | { listId: string } | { tagId: string }

export type TaskSort = 'manual' | 'due' | 'priority' | 'title' | 'created'
