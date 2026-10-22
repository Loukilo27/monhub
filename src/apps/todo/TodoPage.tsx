import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CalendarClock, CalendarDays, CheckCheck, Inbox, ListPlus, type LucideIcon, Pencil, Plus, Search, SlidersHorizontal, Sun, TriangleAlert } from 'lucide-react'
import { createElement, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { IconButton } from '../../components/IconButton'
import { inputBase } from '../../components/Modal'
import { useTimeZone } from '../../data/queries'
import { useNowMinute } from '../../lib/useNow'
import { zonedParts } from '../../../supabase/functions/_shared/zonedTime'
import { newTask, useTodoActions, useTodoData } from './data'
import { ListEditor } from './ListEditor'
import { listIcon } from './listIcons'
import { filterTasks, localToday, NO_FILTERS, positionBetween, PRIORITIES, sortTasks, tasksForView, type TaskFilters } from './logic'
import { parseQuickAdd } from './quickAdd'
import { TaskEditor } from './TaskEditor'
import { SortableTaskRow, TaskRow } from './TaskRow'
import type { Task, TaskSort, TodoList, TodoView } from './types'

const SMART_VIEWS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Aujourd’hui', icon: Sun },
  { id: 'upcoming', label: 'À venir', icon: CalendarDays },
  { id: 'overdue', label: 'En retard', icon: TriangleAlert },
  { id: 'all', label: 'Toutes', icon: Inbox },
  { id: 'completed', label: 'Terminées', icon: CheckCheck },
]

const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'manual', label: 'Ordre manuel' },
  { value: 'due', label: 'Échéance' },
  { value: 'priority', label: 'Priorité' },
  { value: 'title', label: 'Titre' },
  { value: 'created', label: 'Plus récentes' },
]

function parseView(value: string | null): TodoView {
  if (value?.startsWith('list:')) return { listId: value.slice(5) }
  if (value?.startsWith('tag:')) return { tagId: value.slice(4) }
  if (value && SMART_VIEWS.some((view) => view.id === value)) return value as TodoView
  return 'today'
}

function viewKey(view: TodoView): string {
  return typeof view === 'string' ? view : 'listId' in view ? `list:${view.listId}` : `tag:${view.tagId}`
}

/** Zone de dépôt « liste » dans la barre latérale (glisser une tâche vers une autre liste). */
function ListNavItem({ list, active, count, onSelect, onEdit }: {
  list: TodoList
  active: boolean
  count: number
  onSelect: () => void
  onEdit: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}`, data: { listId: list.id } })
  return (
    <li ref={setNodeRef} className={`group flex items-center rounded-xl ${isOver ? 'ring-2 ring-accent' : ''}`}>
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={onSelect}
        className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-left text-sm aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold"
      >
        {createElement(listIcon(list.icon), { 'aria-hidden': true, className: 'size-4', style: { color: list.color } })}
        <span className="flex-1 truncate">{list.name}</span>
        {count > 0 && <span className="text-xs text-muted">{count}</span>}
      </button>
      <IconButton label={`Modifier la liste ${list.name}`} onClick={onEdit} className="size-9! opacity-0 group-hover:opacity-100 focus:opacity-100">
        <Pencil aria-hidden className="size-3.5" />
      </IconButton>
    </li>
  )
}

export default function TodoPage() {
  const [params, setParams] = useSearchParams()
  const view = parseView(params.get('view'))
  const openTaskId = params.get('task')
  const now = useNowMinute()
  const timeZone = useTimeZone()
  const today = localToday(now, timeZone)
  const parts = zonedParts(now, timeZone)
  const nowTime = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`

  const { lists, tasks, tags, loaded } = useTodoData()
  const actions = useTodoActions()
  const [query, setQuery] = useState('')
  const [quickText, setQuickText] = useState('')
  const [sort, setSort] = useState<TaskSort>('manual')
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [editingList, setEditingList] = useState<TodoList | 'new' | null>(null)
  const [draftTask, setDraftTask] = useState<Task | null>(null)

  // Premier lancement : listes Perso, Travail et Courses.
  useEffect(() => {
    if (loaded && lists.length === 0) void actions.createDefaultLists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, lists.length])

  const setView = (next: TodoView) => setParams({ view: viewKey(next) }, { replace: true })
  const openTask = (task: Task) => setParams((current) => ({ ...Object.fromEntries(current), task: task.id }))
  const closeTask = () => {
    setDraftTask(null)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('task')
      return next
    }, { replace: true })
  }

  const currentList = typeof view === 'object' && 'listId' in view ? lists.find((list) => list.id === view.listId) : undefined
  const currentTag = typeof view === 'object' && 'tagId' in view ? tags.find((tag) => tag.id === view.tagId) : undefined
  const title =
    currentList?.name ?? (currentTag ? `#${currentTag.name}` : (SMART_VIEWS.find((item) => item.id === view)?.label ?? 'Tâches'))

  const visible = useMemo(() => {
    const base = tasksForView(tasks, view, today, nowTime)
    const effectiveSort = sort === 'manual' && !currentList ? 'due' : sort
    return sortTasks(filterTasks(base, { ...filters, query }, today), effectiveSort)
  }, [tasks, view, today, nowTime, filters, query, sort, currentList])

  const subtasksOf = (task: Task) => tasks.filter((other) => other.parent_id === task.id)
  const countFor = (target: TodoView) => tasksForView(tasks, target, today, nowTime).length
  const sortable = Boolean(currentList) && sort === 'manual' && !query && filters === NO_FILTERS

  const quick = parseQuickAdd(quickText, today)
  const defaultListId = currentList?.id ?? lists[0]?.id
  const submitQuick = async () => {
    if (!quick.title || !defaultListId) return
    const tagIds = quick.tags.length ? await actions.ensureTags(quick.tags) : []
    if (currentTag) tagIds.push(currentTag.id)
    await actions.addTask(
      newTask(defaultListId, {
        title: quick.title,
        due_date: quick.dueDate ?? (view === 'today' ? today : null),
        due_time: quick.dueTime,
        priority: quick.priority ?? 4,
        tag_ids: [...new Set(tagIds)],
      }),
    )
    setQuickText('')
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const task = tasks.find((item) => item.id === active.id)
    if (!task) return
    const targetListId = over.data.current?.listId as string | undefined
    if (targetListId) {
      if (targetListId === task.list_id) return
      const last = tasks.filter((item) => item.list_id === targetListId && !item.parent_id).reduce((max, item) => Math.max(max, item.position), 0)
      await actions.moveTask(task, targetListId, last + 1)
      return
    }
    const from = visible.findIndex((item) => item.id === active.id)
    const to = visible.findIndex((item) => item.id === over.id)
    if (from < 0 || to < 0) return
    const reordered = arrayMove(visible, from, to)
    await actions.moveTask(task, task.list_id, positionBetween(reordered[to - 1]?.position, reordered[to + 1]?.position))
  }

  const editing = draftTask ?? tasks.find((task) => task.id === openTaskId)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-3 py-3 md:px-6">
        {/* Barre latérale (PC) */}
        <nav aria-label="Vues et listes" className="hidden w-60 shrink-0 md:block">
          <ul className="space-y-0.5">
            {SMART_VIEWS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => setView(item.id as TodoView)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold"
                >
                  <item.icon aria-hidden className={`size-4 ${item.id === 'overdue' ? 'text-danger' : 'text-muted'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id !== 'completed' && countFor(item.id as TodoView) > 0 && (
                    <span className="text-xs text-muted">{countFor(item.id as TodoView)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <h2 className="mt-5 mb-1 flex items-center justify-between px-3 text-xs font-semibold tracking-wide text-muted uppercase">
            Listes
            <IconButton label="Nouvelle liste" onClick={() => setEditingList('new')} className="size-8!">
              <ListPlus aria-hidden className="size-4" />
            </IconButton>
          </h2>
          <ul className="space-y-0.5">
            {lists.map((list) => (
              <ListNavItem
                key={list.id}
                list={list}
                active={currentList?.id === list.id}
                count={countFor({ listId: list.id })}
                onSelect={() => setView({ listId: list.id })}
                onEdit={() => setEditingList(list)}
              />
            ))}
          </ul>
          {tags.length > 0 && (
            <>
              <h2 className="mt-5 mb-1 px-3 text-xs font-semibold tracking-wide text-muted uppercase">Étiquettes</h2>
              <ul className="flex flex-wrap gap-1.5 px-3">
                {tags.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      aria-current={currentTag?.id === tag.id ? 'page' : undefined}
                      onClick={() => setView({ tagId: tag.id })}
                      className="min-h-8 rounded-full border px-2.5 text-xs font-medium aria-[current=page]:text-white"
                      style={{ borderColor: tag.color, color: currentTag?.id === tag.id ? undefined : tag.color, background: currentTag?.id === tag.id ? tag.color : undefined }}
                    >
                      #{tag.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <main className="min-w-0 flex-1">
          {/* Vues et listes (mobile) */}
          <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:hidden">
            {[...SMART_VIEWS.map((item) => ({ key: item.id, label: item.label, target: item.id as TodoView })), ...lists.map((list) => ({ key: `list:${list.id}`, label: list.name, target: { listId: list.id } as TodoView }))].map(
              (item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-current={viewKey(view) === item.key ? 'page' : undefined}
                  onClick={() => setView(item.target)}
                  className="min-h-10 shrink-0 rounded-full bg-surface-2 px-4 text-sm font-medium aria-[current=page]:bg-accent aria-[current=page]:text-accent-contrast"
                >
                  {item.label}
                </button>
              ),
            )}
            <button type="button" onClick={() => setEditingList('new')} className="min-h-10 shrink-0 rounded-full border border-dashed border-border px-4 text-sm">
              + Liste
            </button>
          </div>

          <header className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-2xl font-semibold">{title}</h2>
            {currentList && (
              <IconButton label="Modifier la liste" onClick={() => setEditingList(currentList)}>
                <Pencil aria-hidden className="size-4" />
              </IconButton>
            )}
            {view === 'completed' && visible.length > 0 && (
              <button
                type="button"
                onClick={() => confirm('Supprimer définitivement toutes les tâches terminées ?') && void actions.deleteCompleted()}
                className="min-h-11 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger/10"
              >
                Tout supprimer
              </button>
            )}
          </header>

          {view !== 'completed' && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitQuick()
              }}
              className="mb-3"
            >
              <div className="flex gap-2">
                <input
                  value={quickText}
                  onChange={(event) => setQuickText(event.target.value)}
                  aria-label="Ajouter une tâche"
                  placeholder="Ajouter une tâche… ex. « Appeler Paul demain 14h #perso !2 »"
                  className={inputBase}
                />
                <button type="submit" disabled={!quick.title} aria-label="Ajouter" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-contrast disabled:opacity-50">
                  <Plus aria-hidden className="size-5" />
                </button>
                <IconButton
                  label="Ajouter avec tous les détails"
                  onClick={() => defaultListId && setDraftTask(newTask(defaultListId, { title: quick.title, due_date: view === 'today' ? today : null }))}
                >
                  <CalendarClock aria-hidden className="size-5" />
                </IconButton>
              </div>
              {(quick.dueDate || quick.priority || quick.tags.length > 0) && (
                <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs" aria-live="polite">
                  {quick.dueDate && <span className="rounded-full bg-surface-2 px-2 py-1">📅 {quick.dueDate.split('-').reverse().join('/')}{quick.dueTime && ` ${quick.dueTime}`}</span>}
                  {quick.priority && <span className="rounded-full bg-surface-2 px-2 py-1">Priorité {quick.priority}</span>}
                  {quick.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-2 px-2 py-1">
                      #{tag}
                    </span>
                  ))}
                </p>
              )}
            </form>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-40 flex-1">
              <span className="sr-only">Rechercher</span>
              <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" className={`${inputBase} pl-9`} />
            </label>
            <select aria-label="Trier par" value={sort} onChange={(event) => setSort(event.target.value as TaskSort)} className={`${inputBase} max-w-44 shrink-0`}>
              {SORTS.filter((option) => option.value !== 'manual' || currentList).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <IconButton label="Filtres" aria-pressed={showFilters} onClick={() => setShowFilters((value) => !value)} className={filters !== NO_FILTERS ? 'text-accent!' : ''}>
              <SlidersHorizontal aria-hidden className="size-5" />
            </IconButton>
          </div>

          {showFilters && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  aria-pressed={filters.priorities.includes(priority.value)}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      priorities: filters.priorities.includes(priority.value)
                        ? filters.priorities.filter((value) => value !== priority.value)
                        : [...filters.priorities, priority.value],
                    })
                  }
                  className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 aria-pressed:border-accent aria-pressed:font-semibold"
                >
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: priority.color }} />
                  {priority.label}
                </button>
              ))}
              <select aria-label="Échéance" value={filters.due} onChange={(event) => setFilters({ ...filters, due: event.target.value as TaskFilters['due'] })} className="min-h-9 rounded-full border border-border bg-surface px-3">
                <option value="any">Toutes échéances</option>
                <option value="today">Aujourd’hui</option>
                <option value="week">7 prochains jours</option>
                <option value="none">Sans date</option>
              </select>
              <select aria-label="Étiquette" value={filters.tagId ?? ''} onChange={(event) => setFilters({ ...filters, tagId: event.target.value || null })} className="min-h-9 rounded-full border border-border bg-surface px-3">
                <option value="">Toutes étiquettes</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    #{tag.name}
                  </option>
                ))}
              </select>
              {!currentList && (
                <select aria-label="Liste" value={filters.listId ?? ''} onChange={(event) => setFilters({ ...filters, listId: event.target.value || null })} className="min-h-9 rounded-full border border-border bg-surface px-3">
                  <option value="">Toutes les listes</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              )}
              {filters !== NO_FILTERS && (
                <button type="button" onClick={() => setFilters(NO_FILTERS)} className="min-h-9 px-2 text-accent underline">
                  Réinitialiser
                </button>
              )}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-16 text-center text-muted">{loaded ? (view === 'completed' ? 'Aucune tâche terminée.' : 'Rien à faire ici 🎉') : 'Chargement…'}</p>
          ) : (
            <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy} disabled={!sortable}>
              <ul className="space-y-2" aria-label="Tâches">
                {visible.map((task) => {
                  const rowProps = {
                    task,
                    today,
                    nowTime,
                    tags,
                    subtasks: subtasksOf(task),
                    list: currentList ? undefined : lists.find((list) => list.id === task.list_id),
                    onToggle: () => void actions.toggleComplete(task),
                    onOpen: () => openTask(task),
                  }
                  return sortable ? <SortableTaskRow key={task.id} {...rowProps} /> : <TaskRow key={task.id} {...rowProps} />
                })}
              </ul>
            </SortableContext>
          )}
        </main>
      </div>

      {editing && (
        <TaskEditor key={editing.id} task={editing} isNew={!tasks.some((task) => task.id === editing.id)} today={today} onClose={closeTask} />
      )}
      {editingList && (
        <ListEditor
          list={editingList === 'new' ? null : editingList}
          onClose={() => setEditingList(null)}
          onDeleted={() => setView('today')}
          onCreated={(list) => setView({ listId: list.id })}
        />
      )}
    </DndContext>
  )
}
