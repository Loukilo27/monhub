import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { buttonPrimary, buttonSecondary, inputBase, Modal } from '../../components/Modal'
import { useTodoActions, useTodoData } from './data'
import { LIST_COLORS, LIST_ICONS } from './listIcons'
import type { TodoList } from './types'

/** Création / modification d'une liste : nom, couleur, icône. */
export function ListEditor({ list, onClose, onDeleted, onCreated }: {
  list: TodoList | null
  onClose: () => void
  onDeleted: () => void
  onCreated: (list: TodoList) => void
}) {
  const { lists, tasks } = useTodoData()
  const actions = useTodoActions()
  const [draft, setDraft] = useState<TodoList>(
    list ?? { id: crypto.randomUUID(), name: '', color: LIST_COLORS[lists.length % LIST_COLORS.length], icon: 'list', position: lists.length },
  )
  const taskCount = tasks.filter((task) => task.list_id === draft.id && !task.parent_id).length

  const save = async () => {
    if (!draft.name.trim()) return
    onClose()
    await actions.saveList({ ...draft, name: draft.name.trim() })
    if (!list) onCreated(draft)
  }

  return (
    <Modal
      title={list ? 'Modifier la liste' : 'Nouvelle liste'}
      onClose={onClose}
      footer={
        <>
          {list && (
            <button
              type="button"
              aria-label="Supprimer la liste"
              disabled={lists.length <= 1}
              onClick={() => {
                if (!confirm(`Supprimer la liste « ${list.name} »${taskCount ? ` et ses ${taskCount} tâche(s)` : ''} ?`)) return
                onClose()
                onDeleted()
                void actions.deleteList(list)
              }}
              className={`${buttonSecondary} text-danger`}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Annuler
          </button>
          <button type="button" disabled={!draft.name.trim()} onClick={() => void save()} className={buttonPrimary}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <input
          autoFocus
          aria-label="Nom de la liste"
          placeholder="Nom de la liste"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onKeyDown={(event) => event.key === 'Enter' && void save()}
          className={inputBase}
        />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Couleur</legend>
          <div className="flex flex-wrap gap-2">
            {LIST_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Couleur ${color}`}
                aria-pressed={draft.color === color}
                onClick={() => setDraft({ ...draft, color })}
                className="size-10 rounded-full aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
                style={{ background: color }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Icône</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LIST_ICONS).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                aria-label={`Icône ${name}`}
                aria-pressed={draft.icon === name}
                onClick={() => setDraft({ ...draft, icon: name })}
                className="grid size-11 place-items-center rounded-xl border border-border aria-pressed:border-2"
                style={{ borderColor: draft.icon === name ? draft.color : undefined, color: draft.color }}
              >
                <Icon aria-hidden className="size-5" />
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
