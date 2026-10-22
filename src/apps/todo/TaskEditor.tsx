import { Check, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { buttonPrimary, buttonSecondary, inputBase, Modal } from '../../components/Modal'
import { RecurrencePicker } from '../../components/RecurrencePicker'
import { newTask, useTodoActions, useTodoData } from './data'
import { PRIORITIES, REMINDER_CHOICES } from './logic'
import type { Task } from './types'

/** Édition complète d'une tâche : échéance, priorité, étiquettes, récurrence, rappel, sous-tâches. */
export function TaskEditor({ task, isNew, today, onClose }: { task: Task; isNew: boolean; today: string; onClose: () => void }) {
  const { lists, tags, tasks } = useTodoData()
  const actions = useTodoActions()
  const [draft, setDraft] = useState<Task>(task)
  const [newTag, setNewTag] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const subtasks = tasks.filter((other) => other.parent_id === task.id).sort((a, b) => a.position - b.position)
  const doneCount = subtasks.filter((sub) => sub.completed_at).length

  const set = (patch: Partial<Task>) => setDraft((current) => ({ ...current, ...patch }))

  const save = async () => {
    if (!draft.title.trim()) return
    const clean = { ...draft, title: draft.title.trim(), reminder_offset_minutes: draft.due_date ? draft.reminder_offset_minutes : null }
    onClose()
    if (isNew) await actions.addTask(clean)
    else await actions.saveTask(clean)
  }

  const addTag = async () => {
    const name = newTag.trim().replace(/^#/, '')
    if (!name) return
    const [id] = await actions.ensureTags([name])
    set({ tag_ids: [...new Set([...draft.tag_ids, id])] })
    setNewTag('')
  }

  const addSubtask = async () => {
    const title = newSubtask.trim()
    if (!title) return
    // Une sous-tâche a besoin de sa tâche parente en base : on enregistre d'abord la tâche si elle est nouvelle.
    if (isNew && !tasks.some((other) => other.id === task.id)) await actions.addTask({ ...draft, title: draft.title.trim() || 'Nouvelle tâche' })
    await actions.addTask(newTask(draft.list_id, { parent_id: task.id, title }))
    setNewSubtask('')
  }

  return (
    <Modal
      title={isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button
              type="button"
              aria-label="Supprimer la tâche"
              onClick={() => {
                if (!confirm('Supprimer cette tâche et ses sous-tâches ?')) return
                onClose()
                void actions.deleteTask(task)
              }}
              className={`${buttonSecondary} text-danger`}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Annuler
          </button>
          <button type="button" disabled={!draft.title.trim()} onClick={() => void save()} className={buttonPrimary}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-5 pt-1">
        <input
          autoFocus={isNew}
          aria-label="Titre"
          value={draft.title}
          placeholder="Titre de la tâche"
          onChange={(event) => set({ title: event.target.value })}
          onKeyDown={(event) => event.key === 'Enter' && void save()}
          className={`${inputBase} text-lg font-medium`}
        />
        <textarea
          aria-label="Description"
          value={draft.notes}
          placeholder="Description"
          rows={3}
          onChange={(event) => set({ notes: event.target.value })}
          className={`${inputBase} py-2`}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block space-y-1.5 sm:col-span-1">
            <span className="text-sm font-medium">Liste</span>
            <select value={draft.list_id} onChange={(event) => set({ list_id: event.target.value })} className={inputBase}>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="col-span-2 sm:col-span-1">
            <legend className="mb-1.5 text-sm font-medium">Priorité</legend>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  aria-pressed={draft.priority === priority.value}
                  title={priority.label}
                  onClick={() => set({ priority: priority.value })}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border text-sm font-medium aria-pressed:border-2"
                  style={{ borderColor: draft.priority === priority.value ? priority.color : undefined }}
                >
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: priority.color }} />
                  {priority.value < 4 ? `P${priority.value}` : '—'}
                  <span className="sr-only">{priority.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Échéance</span>
            <input type="date" value={draft.due_date ?? ''} onChange={(event) => set({ due_date: event.target.value || null })} className={inputBase} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Heure</span>
            <span className="flex gap-1">
              <input
                type="time"
                disabled={!draft.due_date}
                value={draft.due_time ?? ''}
                onChange={(event) => set({ due_time: event.target.value || null })}
                className={inputBase}
              />
              {draft.due_time && (
                <IconButton label="Retirer l’heure" onClick={() => set({ due_time: null })}>
                  <X aria-hidden className="size-4" />
                </IconButton>
              )}
            </span>
          </label>
          <label className="col-span-2 block space-y-1.5">
            <span className="text-sm font-medium">Rappel</span>
            <select
              disabled={!draft.due_date}
              value={draft.reminder_offset_minutes ?? ''}
              onChange={(event) => set({ reminder_offset_minutes: event.target.value === '' ? null : Number(event.target.value) })}
              className={inputBase}
            >
              {REMINDER_CHOICES.map((choice) => (
                <option key={String(choice.value)} value={choice.value ?? ''}>
                  {choice.label}
                </option>
              ))}
            </select>
            {draft.due_date && !draft.due_time && draft.reminder_offset_minutes !== null && (
              <span className="text-xs text-muted">Sans heure, l’échéance est fixée à 9 h pour le rappel.</span>
            )}
          </label>
        </div>

        <RecurrencePicker value={draft.recurrence_rule} startDate={draft.due_date ?? today} onChange={(rule) => set({ recurrence_rule: rule })} />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Étiquettes</legend>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = draft.tag_ids.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ tag_ids: active ? draft.tag_ids.filter((id) => id !== tag.id) : [...draft.tag_ids, tag.id] })}
                  className="min-h-9 rounded-full border px-3 text-sm font-medium"
                  style={{
                    borderColor: tag.color,
                    background: active ? tag.color : 'transparent',
                    color: active ? 'white' : tag.color,
                  }}
                >
                  #{tag.name}
                </button>
              )
            })}
            <span className="flex gap-1">
              <input
                value={newTag}
                aria-label="Nouvelle étiquette"
                placeholder="+ étiquette"
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void addTag()}
                className="min-h-9 w-32 rounded-full border border-dashed border-border bg-transparent px-3 text-sm outline-none focus:border-accent"
              />
            </span>
          </div>
        </fieldset>

        <section aria-label="Sous-tâches">
          <h3 className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            Sous-tâches
            {subtasks.length > 0 && (
              <span className="text-muted">
                {doneCount}/{subtasks.length}
              </span>
            )}
          </h3>
          {subtasks.length > 0 && (
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / subtasks.length) * 100}%` }} />
            </div>
          )}
          <ul className="space-y-1">
            {subtasks.map((sub) => (
              <li key={sub.id} className="flex items-center gap-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(sub.completed_at)}
                  aria-label={sub.title}
                  onClick={() => void actions.toggleComplete(sub)}
                  className="grid size-6 shrink-0 place-items-center rounded-md border-2 border-border aria-checked:border-accent aria-checked:bg-accent"
                >
                  {sub.completed_at && <Check aria-hidden className="size-4 text-accent-contrast" />}
                </button>
                <span className={`flex-1 text-sm ${sub.completed_at ? 'text-muted line-through' : ''}`}>{sub.title}</span>
                <IconButton label={`Supprimer « ${sub.title} »`} onClick={() => void actions.deleteTask(sub)} className="size-9!">
                  <X aria-hidden className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-2">
            <input
              value={newSubtask}
              aria-label="Nouvelle sous-tâche"
              placeholder="Ajouter une sous-tâche"
              onChange={(event) => setNewSubtask(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void addSubtask()}
              className={inputBase}
            />
            <IconButton label="Ajouter la sous-tâche" onClick={() => void addSubtask()}>
              <Plus aria-hidden className="size-5" />
            </IconButton>
          </div>
        </section>
      </div>
    </Modal>
  )
}
