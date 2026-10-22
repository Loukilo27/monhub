import { ArrowLeftRight, NotebookPen } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { WidgetProps } from '../types'
import { useNotes } from './data'
import { displayTitle, sortNotes } from './logic'
import { noteBackground } from './types'

/** Widget Aperçu d'une note : la note choisie s'affiche ; sans choix, on en propose quelques-unes. */
export default function NotePreviewWidget({ size, config, onConfigChange }: WidgetProps) {
  const navigate = useNavigate()
  const notes = (useNotes().data ?? []).filter((note) => !note.deleted_at)
  const note = notes.find((candidate) => candidate.id === config?.noteId)

  if (!note) {
    const suggestions = sortNotes(notes, 'updated')
      .sort((a, b) => Number(b.pinned) - Number(a.pinned))
      .slice(0, size.h >= 2 ? 4 : 2)
    return (
      <div className="flex h-full flex-col p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
          <NotebookPen aria-hidden className="size-4" />
          Choisir une note
        </p>
        {suggestions.length === 0 ? (
          <p className="grid flex-1 place-items-center text-center text-sm text-muted">Crée une note dans l’appli Notes</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-hidden">
            {suggestions.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  data-widget-action
                  onClick={() => onConfigChange?.({ noteId: candidate.id })}
                  className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                  style={{ background: noteBackground(candidate.color) }}
                >
                  {displayTitle(candidate)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full" style={{ background: noteBackground(note.color) }}>
      <button
        type="button"
        data-widget-action
        onClick={() => navigate(`/app/notes?note=${note.id}`, { viewTransition: true })}
        aria-label={`Ouvrir la note « ${displayTitle(note)} »`}
        className="flex h-full w-full flex-col p-3 text-left"
      >
        <span className="block truncate pr-8 font-semibold">{displayTitle(note)}</span>
        <span className="mt-1 block min-h-0 flex-1 overflow-hidden text-sm whitespace-pre-line text-muted [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
          {note.title.trim() ? note.content_text : note.content_text.split('\n').slice(1).join('\n')}
        </span>
      </button>
      {onConfigChange && (
        <button
          type="button"
          data-widget-action
          aria-label="Changer de note"
          title="Changer de note"
          onClick={() => onConfigChange({})}
          className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2"
        >
          <ArrowLeftRight aria-hidden className="size-4" />
        </button>
      )}
    </div>
  )
}
