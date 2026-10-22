import { useCallback } from 'react'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import { EMPTY_DOC, type Note } from './types'

export function useNotes() {
  return useRows<Note>('notes')
}

export function newNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: '',
    content: EMPTY_DOC,
    content_text: '',
    color: 'default',
    pinned: false,
    tag_ids: [],
    deleted_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function useNoteActions() {
  const save = useSaveRows<Note>('notes')
  const remove = useDeleteRows('notes')

  /** Enregistre (la date de modification est mise à jour tout de suite pour le tri). */
  const saveNote = useCallback((note: Note) => save.mutateAsync([{ ...note, updated_at: new Date().toISOString() }]), [save])

  const moveToTrash = useCallback((note: Note) => save.mutateAsync([{ ...note, deleted_at: new Date().toISOString(), pinned: false }]), [save])
  const restore = useCallback((note: Note) => save.mutateAsync([{ ...note, deleted_at: null }]), [save])
  const deleteForever = useCallback((ids: string[]) => remove.mutateAsync(ids), [remove])
  const togglePin = useCallback((note: Note) => save.mutateAsync([{ ...note, pinned: !note.pinned }]), [save])

  return { saveNote, moveToTrash, restore, deleteForever, togglePin }
}
