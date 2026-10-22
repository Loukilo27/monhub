import type { JSONContent } from '@tiptap/core'
import { loadRows, str } from '../../assistant/helpers'
import type { AiTool } from '../../assistant/types'
import { newNote } from './data'
import { displayTitle, excerpt, matchesQuery } from './logic'
import type { Note } from './types'

/** Texte brut → document TipTap (lignes « - » ou « • » en liste à puces). */
export function textToDoc(text: string): JSONContent {
  const content: JSONContent[] = []
  let bullets: JSONContent[] = []
  const flush = () => {
    if (bullets.length) content.push({ type: 'bulletList', content: bullets })
    bullets = []
  }
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
    if (bullet) {
      bullets.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: bullet[1] }] }] })
      continue
    }
    flush()
    content.push(line.trim() ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })
  }
  flush()
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

export const notesTools: AiTool[] = [
  {
    name: 'creer_note',
    description: 'Crée une note (texte simple ; lignes commençant par « - » en liste à puces).',
    parameters: { type: 'object', properties: { titre: { type: 'string' }, contenu: { type: 'string' } }, required: ['titre'] },
    confirm: true,
    summarize: (args) => `Créer la note « ${str(args.titre)} »${str(args.contenu) ? ` : ${excerpt(str(args.contenu), 80)}` : ''}`,
    execute: async (args, ctx) => {
      const text = str(args.contenu)
      const note = newNote({ title: str(args.titre), content: textToDoc(text), content_text: text })
      await ctx.notes.saveNote(note)
      return { ok: true, id: note.id }
    },
  },
  {
    name: 'rechercher_notes',
    description: 'Recherche dans les notes (titre et contenu) et renvoie les extraits.',
    parameters: { type: 'object', properties: { recherche: { type: 'string' } }, required: ['recherche'] },
    confirm: false,
    summarize: (args) => `Recherche dans les notes : « ${str(args.recherche)} »`,
    execute: async (args, ctx) => {
      const notes = (await loadRows<Note>(ctx, 'notes')).filter((note) => !note.deleted_at && matchesQuery(note, str(args.recherche)))
      return { notes: notes.slice(0, 8).map((note) => ({ id: note.id, titre: displayTitle(note), extrait: excerpt(note.content_text, 400) })), total: notes.length }
    },
  },
]
