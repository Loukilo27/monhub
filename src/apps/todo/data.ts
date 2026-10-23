import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { backend } from '../../data'
import { useTimeZone } from '../../data/queries'
import { rowsKey, useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import { describeDue, localToday, nextRecurringTask, reminderTime } from './logic'
import type { Tag, Task, TodoList } from './types'

export const DEFAULT_LISTS: Omit<TodoList, 'id'>[] = [
  { name: 'Perso', color: '#10b981', icon: 'user', position: 0 },
  { name: 'Travail', color: '#3b82f6', icon: 'briefcase', position: 1 },
  { name: 'Courses', color: '#f59e0b', icon: 'shopping-cart', position: 2 },
]

export const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']

export function useTodoData() {
  const lists = useRows<TodoList>('todo_lists')
  const tasks = useRows<Task>('tasks')
  const tags = useRows<Tag>('tags')
  return useMemo(
    () => ({
      lists: [...(lists.data ?? [])].sort((a, b) => a.position - b.position),
      tasks: tasks.data ?? [],
      tags: [...(tags.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      loaded: lists.isSuccess && tasks.isSuccess && tags.isSuccess,
    }),
    [lists.data, tasks.data, tags.data, lists.isSuccess, tasks.isSuccess, tags.isSuccess],
  )
}

export function newTask(listId: string, overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    list_id: listId,
    parent_id: null,
    title: '',
    notes: '',
    due_date: null,
    due_time: null,
    priority: 4,
    tag_ids: [],
    recurrence_rule: null,
    reminder_offset_minutes: null,
    position: Date.now(),
    completed_at: null,
    ...overrides,
  }
}

/** Programme (ou annule) le rappel push d'une tâche. */
export async function scheduleTaskReminder(task: Task, timeZone: string) {
  await backend.cancelReminders(task.id)
  const at = reminderTime(task, timeZone)
  if (!at || at.getTime() <= Date.now() || task.parent_id || task.completed_at) return
  await backend.createReminder({
    source: 'todo',
    kind: 'task',
    refId: task.id,
    title: task.title,
    body: describeDue(task, localToday(new Date(), timeZone)),
    url: `/app/todo?task=${task.id}`,
    actions: ['done', 'snooze'],
    sendAt: at,
    offsetMinutes: task.reminder_offset_minutes ?? 0,
  })
}

/** Actions de la to-do, avec programmation des rappels (push) à chaque changement d'échéance. */
export function useTodoActions() {
  const queryClient = useQueryClient()
  const timeZone = useTimeZone()
  const saveTasks = useSaveRows<Task>('tasks')
  const removeTasks = useDeleteRows('tasks')
  const saveLists = useSaveRows<TodoList>('todo_lists')
  const removeLists = useDeleteRows('todo_lists')
  const saveTags = useSaveRows<Tag>('tags')
  const removeTags = useDeleteRows('tags')

  const currentTasks = useCallback(() => queryClient.getQueryData<Task[]>(rowsKey('tasks')) ?? [], [queryClient])

  const scheduleReminder = useCallback((task: Task) => scheduleTaskReminder(task, timeZone), [timeZone])

  const saveTask = useCallback(
    async (task: Task) => {
      await saveTasks.mutateAsync([task])
      await scheduleReminder(task).catch(() => undefined)
    },
    [saveTasks, scheduleReminder],
  )

  /** Ajoute une tâche en fin de liste. */
  const addTask = useCallback(
    async (task: Task) => {
      const siblings = currentTasks().filter((other) => other.list_id === task.list_id && other.parent_id === task.parent_id)
      const position = siblings.reduce((max, other) => Math.max(max, other.position), 0) + 1
      await saveTask({ ...task, position })
    },
    [currentTasks, saveTask],
  )

  /** Coche / décoche. Une tâche récurrente cochée crée l'occurrence suivante (avec ses sous-tâches). */
  const toggleComplete = useCallback(
    async (task: Task) => {
      if (task.completed_at) {
        await saveTask({ ...task, completed_at: null })
        return
      }
      const done = { ...task, completed_at: new Date().toISOString() }
      const next = task.parent_id ? null : nextRecurringTask(task, localToday(new Date(), timeZone), crypto.randomUUID())
      const subtasks = next
        ? currentTasks()
            .filter((other) => other.parent_id === task.id)
            .map((sub) => ({ ...sub, id: crypto.randomUUID(), parent_id: next.id, completed_at: null }))
        : []
      await saveTasks.mutateAsync([done, ...(next ? [next] : []), ...subtasks])
      await backend.cancelReminders(task.id).catch(() => undefined)
      if (next) await scheduleReminder(next).catch(() => undefined)
    },
    [currentTasks, saveTask, saveTasks, scheduleReminder, timeZone],
  )

  const deleteTask = useCallback(
    async (task: Task) => {
      const ids = [task.id, ...currentTasks().filter((other) => other.parent_id === task.id).map((sub) => sub.id)]
      await backend.cancelReminders(task.id).catch(() => undefined)
      await removeTasks.mutateAsync(ids)
    },
    [currentTasks, removeTasks],
  )

  const deleteCompleted = useCallback(async () => {
    const done = currentTasks().filter((task) => task.completed_at && !task.parent_id)
    const ids = new Set(done.map((task) => task.id))
    const subtasks = currentTasks().filter((task) => task.parent_id && ids.has(task.parent_id))
    await removeTasks.mutateAsync([...ids, ...subtasks.map((task) => task.id)])
  }, [currentTasks, removeTasks])

  /** Déplace une tâche (et ses sous-tâches) vers une autre liste et/ou position. */
  const moveTask = useCallback(
    async (task: Task, listId: string, position: number) => {
      const subtasks = listId === task.list_id ? [] : currentTasks().filter((other) => other.parent_id === task.id)
      await saveTasks.mutateAsync([{ ...task, list_id: listId, position }, ...subtasks.map((sub) => ({ ...sub, list_id: listId }))])
    },
    [currentTasks, saveTasks],
  )

  const saveList = useCallback((list: TodoList) => saveLists.mutateAsync([list]), [saveLists])

  const deleteList = useCallback(
    async (list: TodoList) => {
      const listTasks = currentTasks().filter((task) => task.list_id === list.id)
      await Promise.all(listTasks.map((task) => backend.cancelReminders(task.id).catch(() => undefined)))
      await removeLists.mutateAsync([list.id])
      // La base supprime les tâches en cascade ; on met le cache à jour tout de suite.
      queryClient.setQueryData<Task[]>(rowsKey('tasks'), (tasks = []) => tasks.filter((task) => task.list_id !== list.id))
    },
    [currentTasks, removeLists, queryClient],
  )

  const createDefaultLists = useCallback(
    () => saveLists.mutateAsync(DEFAULT_LISTS.map((list) => ({ ...list, id: crypto.randomUUID() }))),
    [saveLists],
  )

  /** Identifiants des étiquettes demandées par leur nom, en créant celles qui n'existent pas. */
  const ensureTags = useCallback(
    async (names: string[]) => {
      const existing = queryClient.getQueryData<Tag[]>(rowsKey('tags')) ?? []
      const created: Tag[] = []
      const ids = names.map((name) => {
        const found = [...existing, ...created].find((tag) => tag.name.toLowerCase() === name.toLowerCase())
        if (found) return found.id
        const tag = { id: crypto.randomUUID(), name, color: TAG_COLORS[(existing.length + created.length) % TAG_COLORS.length] }
        created.push(tag)
        return tag.id
      })
      if (created.length) await saveTags.mutateAsync(created)
      return ids
    },
    [queryClient, saveTags],
  )

  const deleteTag = useCallback(
    async (tag: Tag) => {
      const affected = currentTasks().filter((task) => task.tag_ids.includes(tag.id))
      if (affected.length) await saveTasks.mutateAsync(affected.map((task) => ({ ...task, tag_ids: task.tag_ids.filter((id) => id !== tag.id) })))
      await removeTags.mutateAsync([tag.id])
    },
    [currentTasks, saveTasks, removeTags],
  )

  return { saveTask, addTask, toggleComplete, deleteTask, deleteCompleted, moveTask, saveList, deleteList, createDefaultLists, ensureTags, deleteTag }
}
