import { ArchiveRestore, LayoutGrid, List, Pin, Plus, Rows3, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { IconButton } from '../../components/IconButton'
import { inputBase } from '../../components/Modal'
import { useNowMinute } from '../../lib/useNow'
import { formatRelative } from '../../lib/time'
import { useTodoData } from '../todo/data'
import type { Tag } from '../todo/types'
import { newNote, useNoteActions, useNotes } from './data'
import { daysLeftInTrash, displayTitle, excerpt, visibleNotes } from './logic'
import { NoteEditor } from './NoteEditor'
import { noteBackground, type Note, type NoteSort } from './types'

const LAYOUT_KEY = 'monhub.notes.layout'

function readLayout(): 'grid' | 'list' {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function NoteCard({ note, tags, layout, now, onOpen, onTogglePin }: {
  note: Note
  tags: Tag[]
  layout: 'grid' | 'list'
  now: Date
  onOpen: () => void
  onTogglePin?: () => void
}) {
  const noteTags = tags.filter((tag) => note.tag_ids.includes(tag.id))
  const preview = excerpt(note.title.trim() ? note.content_text : note.content_text.split('\n').slice(1).join(' '), layout === 'grid' ? 220 : 120)
  return (
    <li className="group relative break-inside-avoid">
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-2xl border border-border p-4 text-left shadow-soft transition-shadow hover:shadow-lg ${layout === 'grid' ? 'mb-3' : 'flex items-baseline gap-4'}`}
        style={{ background: noteBackground(note.color) }}
      >
        <span className={`block font-semibold ${layout === 'list' ? 'w-1/3 shrink-0 truncate' : 'pr-8'}`}>{displayTitle(note)}</span>
        {preview && <span className={`mt-1 block text-sm text-muted ${layout === 'grid' ? 'line-clamp-6 whitespace-pre-line' : 'flex-1 truncate'}`}>{preview}</span>}
        <span className={`flex flex-wrap items-center gap-2 text-xs text-muted ${layout === 'grid' ? 'mt-3' : 'shrink-0'}`}>
          {noteTags.map((tag) => (
            <span key={tag.id} style={{ color: tag.color }}>
              #{tag.name}
            </span>
          ))}
          {note.deleted_at ? (
            <span className="text-danger">Suppression dans {daysLeftInTrash(note.deleted_at, now)} j</span>
          ) : (
            note.updated_at && <span>{formatRelative(new Date(note.updated_at), now)}</span>
          )}
        </span>
      </button>
      {onTogglePin && (
        <IconButton
          label={note.pinned ? `Désépingler « ${displayTitle(note)} »` : `Épingler « ${displayTitle(note)} »`}
          aria-pressed={note.pinned}
          onClick={onTogglePin}
          className={`absolute! top-1 right-1 ${note.pinned ? 'text-accent!' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'} ${layout === 'list' ? 'top-1/2 -translate-y-1/2' : ''}`}
        >
          <Pin aria-hidden className="size-4" />
        </IconButton>
      )}
    </li>
  )
}

export default function NotesPage() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('note')
  const trash = params.get('vue') === 'corbeille'
  const now = useNowMinute()
  const notesQuery = useNotes()
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data])
  const { tags } = useTodoData()
  const actions = useNoteActions()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<NoteSort>('updated')
  const [tagId, setTagId] = useState<string | null>(null)
  const [layout, setLayout] = useState(readLayout)
  const [draft, setDraft] = useState<Note | null>(null)

  const { pinned, others } = useMemo(() => visibleNotes(notes, { trash, query, tagId, sort }), [notes, trash, query, tagId, sort])
  const usedTags = tags.filter((tag) => notes.some((note) => !note.deleted_at && note.tag_ids.includes(tag.id)))
  const trashCount = notes.filter((note) => note.deleted_at).length

  const open = (note: Note) => setParams({ note: note.id })
  const back = () => {
    setDraft(null)
    setParams(trash ? { vue: 'corbeille' } : {})
  }

  const create = async () => {
    const note = newNote()
    // Enregistrée tout de suite : l'éditeur et les autres appareils la voient.
    await actions.saveNote(note)
    setDraft(note)
    setParams({ note: note.id })
  }

  const chooseLayout = (value: 'grid' | 'list') => {
    setLayout(value)
    try {
      localStorage.setItem(LAYOUT_KEY, value)
    } catch {
      // Préférence non conservée : sans gravité.
    }
  }

  const editing = notes.find((note) => note.id === openId) ?? (draft?.id === openId ? draft : null)
  if (openId && editing) return <NoteEditor key={editing.id} note={editing} onBack={back} />

  const listClass = layout === 'grid' ? 'columns-1 gap-3 sm:columns-2 lg:columns-3' : 'space-y-2'
  const renderList = (items: Note[]) => (
    <ul className={listClass}>
      {items.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          tags={tags}
          layout={layout}
          now={now}
          onOpen={() => open(note)}
          onTogglePin={trash ? undefined : () => void actions.togglePin(note)}
        />
      ))}
    </ul>
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-2xl font-semibold">{trash ? 'Corbeille' : 'Notes'}</h2>
        <div role="radiogroup" aria-label="Affichage" className="flex rounded-xl bg-surface-2 p-1">
          <IconButton label="En grille" role="radio" aria-checked={layout === 'grid'} onClick={() => chooseLayout('grid')} className="size-9! rounded-lg! aria-checked:bg-surface">
            <LayoutGrid aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="En liste" role="radio" aria-checked={layout === 'list'} onClick={() => chooseLayout('list')} className="size-9! rounded-lg! aria-checked:bg-surface">
            <Rows3 aria-hidden className="size-4" />
          </IconButton>
        </div>
        <button
          type="button"
          onClick={() => setParams(trash ? {} : { vue: 'corbeille' })}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-surface-2"
        >
          {trash ? <List aria-hidden className="size-4" /> : <Trash2 aria-hidden className="size-4" />}
          {trash ? 'Toutes les notes' : `Corbeille${trashCount ? ` (${trashCount})` : ''}`}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Rechercher dans les notes</span>
          <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans les notes" className={`${inputBase} pl-9`} />
        </label>
        {!trash && (
          <select aria-label="Trier par" value={sort} onChange={(event) => setSort(event.target.value as NoteSort)} className={`${inputBase} max-w-52`}>
            <option value="updated">Modifiées récemment</option>
            <option value="created">Créées récemment</option>
            <option value="title">Titre (A → Z)</option>
          </select>
        )}
      </div>

      {!trash && usedTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par étiquette">
          {usedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={tagId === tag.id}
              onClick={() => setTagId(tagId === tag.id ? null : tag.id)}
              className="min-h-9 rounded-full border px-3 text-sm font-medium"
              style={{ borderColor: tag.color, background: tagId === tag.id ? tag.color : 'transparent', color: tagId === tag.id ? 'white' : tag.color }}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      {trash && others.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          <span className="flex-1 text-muted">Les notes de la corbeille sont supprimées définitivement après 30 jours.</span>
          <button
            type="button"
            onClick={() => confirm('Vider la corbeille ? Les notes seront supprimées définitivement.') && void actions.deleteForever(others.map((note) => note.id))}
            className="min-h-10 rounded-xl px-3 font-medium text-danger hover:bg-danger/10"
          >
            Vider la corbeille
          </button>
        </div>
      )}

      {trash ? (
        others.length === 0 ? (
          <p className="py-16 text-center text-muted">La corbeille est vide.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((note) => (
              <li key={note.id} className="flex items-center gap-2 rounded-2xl border border-border p-3" style={{ background: noteBackground(note.color) }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{displayTitle(note)}</span>
                  <span className="block text-xs text-muted">Suppression définitive dans {daysLeftInTrash(note.deleted_at!, now)} jours</span>
                </span>
                <button type="button" onClick={() => void actions.restore(note)} className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-surface-2">
                  <ArchiveRestore aria-hidden className="size-4" />
                  Restaurer
                </button>
                <IconButton
                  label={`Supprimer définitivement « ${displayTitle(note)} »`}
                  onClick={() => confirm('Supprimer définitivement cette note ?') && void actions.deleteForever([note.id])}
                  className="text-danger!"
                >
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )
      ) : pinned.length + others.length === 0 ? (
        <p className="py-16 text-center text-muted">{query || tagId ? 'Aucune note ne correspond.' : 'Aucune note pour l’instant.'}</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section aria-label="Notes épinglées" className="mb-4">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Épinglées</h3>
              {renderList(pinned)}
            </section>
          )}
          <section aria-label="Autres notes">
            {pinned.length > 0 && others.length > 0 && <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Autres</h3>}
            {renderList(others)}
          </section>
        </>
      )}

      {!trash && (
        <button
          type="button"
          onClick={() => void create()}
          aria-label="Nouvelle note"
          className="fixed right-5 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-20 grid size-14 place-items-center rounded-full bg-accent text-accent-contrast shadow-soft"
        >
          <Plus aria-hidden className="size-6" />
        </button>
      )}
    </div>
  )
}
