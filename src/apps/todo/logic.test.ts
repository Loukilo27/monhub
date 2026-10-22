import { describe, expect, it } from 'vitest'
import {
  describeDue,
  filterTasks,
  isOverdue,
  localToday,
  NO_FILTERS,
  nextRecurringTask,
  positionBetween,
  reminderTime,
  sortTasks,
  tasksForView,
} from './logic'
import type { Task } from './types'

const TODAY = '2026-10-22'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36),
    list_id: 'perso',
    parent_id: null,
    title: 'Tâche',
    notes: '',
    due_date: null,
    due_time: null,
    priority: 4,
    tag_ids: [],
    recurrence_rule: null,
    reminder_offset_minutes: null,
    position: 0,
    completed_at: null,
    ...overrides,
  }
}

describe('vues', () => {
  const tasks = [
    task({ id: 'hier', due_date: '2026-10-21' }),
    task({ id: 'ajd', due_date: TODAY, due_time: '18:00' }),
    task({ id: 'ajd-passee', due_date: TODAY, due_time: '08:00' }),
    task({ id: 'demain', due_date: '2026-10-23' }),
    task({ id: 'sans-date' }),
    task({ id: 'faite', due_date: TODAY, completed_at: '2026-10-22T08:00:00Z' }),
    task({ id: 'sous', parent_id: 'ajd', due_date: TODAY }),
  ]
  const ids = (list: Task[]) => list.map((item) => item.id)

  it('Aujourd’hui inclut le retard, sans les tâches faites ni les sous-tâches', () => {
    expect(ids(tasksForView(tasks, 'today', TODAY, '10:00'))).toEqual(['hier', 'ajd', 'ajd-passee'])
  })

  it('À venir, En retard, Toutes, Terminées', () => {
    expect(ids(tasksForView(tasks, 'upcoming', TODAY))).toEqual(['demain'])
    expect(ids(tasksForView(tasks, 'overdue', TODAY, '10:00'))).toEqual(['hier', 'ajd-passee'])
    expect(ids(tasksForView(tasks, 'all', TODAY))).toHaveLength(5)
    expect(ids(tasksForView(tasks, 'completed', TODAY))).toEqual(['faite'])
  })

  it('détecte le retard à l’heure près', () => {
    expect(isOverdue(task({ due_date: TODAY, due_time: '09:59' }), TODAY, '10:00')).toBe(true)
    expect(isOverdue(task({ due_date: TODAY }), TODAY, '23:59')).toBe(false)
  })
})

describe('recherche, filtres et tri', () => {
  const tasks = [
    task({ id: 'a', title: 'Écrire le rapport', priority: 2, due_date: '2026-10-25', tag_ids: ['travail'], position: 3 }),
    task({ id: 'b', title: 'Acheter du café', priority: 1, notes: 'grains', position: 1 }),
    task({ id: 'c', title: 'Banque', priority: 4, due_date: TODAY, due_time: '09:00', position: 2 }),
  ]

  it('cherche sans tenir compte des accents, dans le titre et les notes', () => {
    expect(filterTasks(tasks, { ...NO_FILTERS, query: 'ecrire' }, TODAY).map((t) => t.id)).toEqual(['a'])
    expect(filterTasks(tasks, { ...NO_FILTERS, query: 'GRAINS' }, TODAY).map((t) => t.id)).toEqual(['b'])
  })

  it('filtre par priorité, étiquette et échéance', () => {
    expect(filterTasks(tasks, { ...NO_FILTERS, priorities: [1, 2] }, TODAY).map((t) => t.id)).toEqual(['a', 'b'])
    expect(filterTasks(tasks, { ...NO_FILTERS, tagId: 'travail' }, TODAY).map((t) => t.id)).toEqual(['a'])
    expect(filterTasks(tasks, { ...NO_FILTERS, due: 'none' }, TODAY).map((t) => t.id)).toEqual(['b'])
    expect(filterTasks(tasks, { ...NO_FILTERS, due: 'week' }, TODAY).map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('trie par ordre manuel, échéance, priorité ou titre', () => {
    expect(sortTasks(tasks, 'manual').map((t) => t.id)).toEqual(['b', 'c', 'a'])
    expect(sortTasks(tasks, 'due').map((t) => t.id)).toEqual(['c', 'a', 'b'])
    expect(sortTasks(tasks, 'priority').map((t) => t.id)).toEqual(['b', 'a', 'c'])
    expect(sortTasks(tasks, 'title').map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('calcule une position entre deux voisins', () => {
    expect(positionBetween(1, 2)).toBe(1.5)
    expect(positionBetween(undefined, 2)).toBe(1)
    expect(positionBetween(5, undefined)).toBe(6)
  })
})

describe('échéances et rappels', () => {
  it('décrit l’échéance en français', () => {
    expect(describeDue(task({ due_date: TODAY, due_time: '14:00' }), TODAY)).toBe('Aujourd’hui 14:00')
    expect(describeDue(task({ due_date: '2026-10-23' }), TODAY)).toBe('Demain')
    expect(describeDue(task({ due_date: '2026-10-26' }), TODAY)).toBe('lun. 26 oct.')
  })

  it('calcule l’heure du rappel à Paris', () => {
    // 14:00 à Paris (UTC+2) − 15 min = 11:45 UTC
    expect(reminderTime(task({ due_date: TODAY, due_time: '14:00', reminder_offset_minutes: 15 }), 'Europe/Paris')?.toISOString()).toBe(
      '2026-10-22T11:45:00.000Z',
    )
    // Sans heure : 9:00 la veille (1 jour avant)
    expect(reminderTime(task({ due_date: TODAY, reminder_offset_minutes: 1440 }), 'Europe/Paris')?.toISOString()).toBe(
      '2026-10-21T07:00:00.000Z',
    )
    expect(reminderTime(task({ due_date: TODAY }), 'Europe/Paris')).toBeNull()
  })

  it('donne la date du jour dans le fuseau', () => {
    expect(localToday(new Date('2026-10-22T22:30:00Z'), 'Europe/Paris')).toBe('2026-10-23')
  })
})

describe('tâches récurrentes', () => {
  it('cocher crée l’occurrence suivante', () => {
    const weekly = task({ id: 'r', due_date: '2026-10-19', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TH', completed_at: 'x' })
    expect(nextRecurringTask(weekly, TODAY, 'r2')).toMatchObject({ id: 'r2', due_date: '2026-10-22', completed_at: null })
    const monthly = task({ due_date: '2026-10-01', recurrence_rule: 'FREQ=MONTHLY;BYMONTHDAY=1' })
    expect(nextRecurringTask(monthly, TODAY, 'm2')?.due_date).toBe('2026-11-01')
  })

  it('ne fait rien sans règle ou si la série est terminée', () => {
    expect(nextRecurringTask(task({ due_date: TODAY }), TODAY, 'x')).toBeNull()
    expect(nextRecurringTask(task({ due_date: TODAY, recurrence_rule: 'FREQ=DAILY;UNTIL=20261022' }), TODAY, 'x')).toBeNull()
  })
})
