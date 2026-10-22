import type { Note, NoteSort } from './types'

export const TRASH_DAYS = 30

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Recherche plein texte (titre + contenu), sans accents ni majuscules ; tous les mots doivent figurer. */
export function matchesQuery(note: Note, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = normalize(`${note.title}\n${note.content_text}`)
  return words.every((word) => haystack.includes(word))
}

export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  const sorted = [...notes]
  if (sort === 'title') return sorted.sort((a, b) => (a.title || a.content_text).localeCompare(b.title || b.content_text, 'fr', { sensitivity: 'base' }))
  const key = sort === 'created' ? 'created_at' : 'updated_at'
  return sorted.sort((a, b) => (b[key] ?? '').localeCompare(a[key] ?? ''))
}

/** Notes visibles : hors corbeille (ou corbeille seule), filtrées, triées, épinglées en tête. */
export function visibleNotes(notes: Note[], options: { trash: boolean; query: string; tagId: string | null; sort: NoteSort }) {
  const filtered = notes.filter(
    (note) =>
      Boolean(note.deleted_at) === options.trash &&
      matchesQuery(note, options.query) &&
      (!options.tagId || note.tag_ids.includes(options.tagId)),
  )
  const sorted = sortNotes(filtered, options.trash ? 'updated' : options.sort)
  if (options.trash) return { pinned: [], others: sorted }
  return { pinned: sorted.filter((note) => note.pinned), others: sorted.filter((note) => !note.pinned) }
}

/** Début du texte, sur une seule ligne. */
export function excerpt(text: string, length = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat
}

/** Titre affiché : le titre, sinon la première ligne du texte, sinon « Sans titre ». */
export function displayTitle(note: Pick<Note, 'title' | 'content_text'>): string {
  return note.title.trim() || excerpt(note.content_text.split('\n').find((line) => line.trim()) ?? '', 60) || 'Sans titre'
}

/** Jours restants avant la suppression définitive d'une note de la corbeille. */
export function daysLeftInTrash(deletedAt: string, now: Date): number {
  const elapsed = (now.getTime() - new Date(deletedAt).getTime()) / 86_400_000
  // Horloge de la page légèrement en retard sur la suppression : jamais plus de 30 jours.
  return Math.min(TRASH_DAYS, Math.max(0, Math.ceil(TRASH_DAYS - elapsed)))
}
