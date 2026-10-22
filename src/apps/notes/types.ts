import type { JSONContent } from '@tiptap/core'

/** Ligne de la table notes (mêmes noms de colonnes qu'en base). */
export interface Note {
  id: string
  title: string
  /** Document TipTap (JSON). */
  content: JSONContent
  /** Texte brut, pour la recherche et les aperçus. */
  content_text: string
  /** Clé de la palette NOTE_COLORS. */
  color: string
  pinned: boolean
  tag_ids: string[]
  deleted_at: string | null
  created_at?: string
  updated_at?: string
}

export type NoteSort = 'updated' | 'created' | 'title'

/** Couleurs de fond des notes : une teinte claire et une sombre (thème), via des variables CSS. */
export const NOTE_COLORS = [
  { id: 'default', label: 'Par défaut' },
  { id: 'yellow', label: 'Jaune' },
  { id: 'orange', label: 'Orange' },
  { id: 'red', label: 'Rouge' },
  { id: 'pink', label: 'Rose' },
  { id: 'purple', label: 'Violet' },
  { id: 'blue', label: 'Bleu' },
  { id: 'teal', label: 'Turquoise' },
  { id: 'green', label: 'Vert' },
  { id: 'gray', label: 'Gris' },
] as const

export function noteBackground(color: string): string {
  return color === 'default' || !NOTE_COLORS.some((item) => item.id === color) ? 'var(--surface)' : `var(--note-${color})`
}

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
