import { EditorContent, useEditor } from '@tiptap/react'
import { ArrowLeft, Check, CloudOff, LoaderCircle, Paintbrush, Pin, PinOff, Tag, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { useToast } from '../../components/toast'
import { useTodoActions, useTodoData } from '../todo/data'
import { useNoteActions } from './data'
import { noteExtensions } from './editorConfig'
import { EditorToolbar } from './EditorToolbar'
import { NOTE_COLORS, noteBackground, type Note } from './types'

type SaveState = 'saved' | 'pending' | 'saving' | 'error'
const AUTOSAVE_DELAY_MS = 800

interface Meta {
  color: string
  tag_ids: string[]
  pinned: boolean
}

const STATUS: Record<SaveState, { icon: typeof Check; text: string; className: string }> = {
  saved: { icon: Check, text: 'Enregistré', className: 'text-muted' },
  pending: { icon: LoaderCircle, text: 'Modifications…', className: 'text-muted' },
  saving: { icon: LoaderCircle, text: 'Enregistrement…', className: 'text-muted' },
  error: { icon: CloudOff, text: 'Non enregistré — nouvel essai à la reconnexion', className: 'text-danger' },
}

/** Éditeur plein écran d'une note, avec sauvegarde automatique. */
export function NoteEditor({ note, onBack }: { note: Note; onBack: () => void }) {
  const { saveNote, moveToTrash } = useNoteActions()
  const { tags } = useTodoData()
  const { ensureTags } = useTodoActions()
  const toast = useToast()
  const [title, setTitle] = useState(note.title)
  const [meta, setMeta] = useState<Meta>({ color: note.color, tag_ids: note.tag_ids, pinned: note.pinned })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [panel, setPanel] = useState<'color' | 'tags' | null>(null)
  const [newTag, setNewTag] = useState('')

  // État courant gardé dans des références : lisibles par la sauvegarde différée,
  // y compris après la fermeture de l'éditeur.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const titleRef = useRef(note.title)
  const metaRef = useRef<Meta>({ color: note.color, tag_ids: note.tag_ids, pinned: note.pinned })
  const contentRef = useRef({ json: note.content, text: note.content_text })

  /** Le contenu tel qu'il doit être enregistré maintenant. */
  const snapshot = (): Note => ({
    ...note,
    ...metaRef.current,
    title: titleRef.current,
    content: contentRef.current.json,
    content_text: contentRef.current.text,
  })

  const flush = async () => {
    clearTimeout(timer.current)
    timer.current = undefined
    setSaveState('saving')
    try {
      await saveNote(snapshot())
      setSaveState((state) => (state === 'saving' ? 'saved' : state))
    } catch {
      setSaveState('error')
    }
  }
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })

  // Sauvegarde automatique après une courte pause.
  const schedule = () => {
    setSaveState('pending')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flushRef.current(), AUTOSAVE_DELAY_MS)
  }

  const editor = useEditor({
    extensions: noteExtensions,
    content: note.content,
    editorProps: { attributes: { class: 'note-content', 'aria-label': 'Contenu de la note' } },
    onUpdate: ({ editor: current }) => {
      contentRef.current = { json: current.getJSON(), text: current.getText({ blockSeparator: '\n' }) }
      schedule()
    },
  })

  // En quittant la note, l'onglet ou l'app : enregistre ce qui ne l'est pas encore.
  // Au retour du réseau, retente un enregistrement échoué.
  useEffect(() => {
    const flushIfPending = () => {
      if (timer.current) void flushRef.current()
    }
    const onOnline = () => void flushRef.current()
    window.addEventListener('pagehide', flushIfPending)
    document.addEventListener('visibilitychange', flushIfPending)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('pagehide', flushIfPending)
      document.removeEventListener('visibilitychange', flushIfPending)
      window.removeEventListener('online', onOnline)
      flushIfPending()
    }
  }, [])

  const updateMeta = (patch: Partial<Meta>) => {
    metaRef.current = { ...metaRef.current, ...patch }
    setMeta(metaRef.current)
    schedule()
  }

  const addTag = async () => {
    const name = newTag.trim().replace(/^#/, '')
    if (!name) return
    const [id] = await ensureTags([name])
    updateMeta({ tag_ids: [...new Set([...metaRef.current.tag_ids, id])] })
    setNewTag('')
  }

  const trash = async () => {
    clearTimeout(timer.current)
    timer.current = undefined
    await moveToTrash(snapshot())
    toast('Note déplacée dans la corbeille (30 jours).', 'info')
    onBack()
  }

  const status = STATUS[saveState]
  const background = noteBackground(meta.color)

  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-col" style={{ background }}>
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] z-[5] border-b border-border/60" style={{ background }}>
        <div className="flex items-center gap-1 px-2 pt-1">
          <IconButton label="Retour aux notes" onClick={onBack}>
            <ArrowLeft aria-hidden className="size-5" />
          </IconButton>
          <span role="status" aria-live="polite" className={`flex flex-1 items-center gap-1.5 text-xs ${status.className}`}>
            <status.icon aria-hidden className={`size-3.5 ${saveState === 'saving' || saveState === 'pending' ? 'animate-spin' : ''}`} />
            {status.text}
          </span>
          <IconButton label={meta.pinned ? 'Désépingler' : 'Épingler'} aria-pressed={meta.pinned} onClick={() => updateMeta({ pinned: !meta.pinned })}>
            {meta.pinned ? <PinOff aria-hidden className="size-5" /> : <Pin aria-hidden className="size-5" />}
          </IconButton>
          <IconButton label="Couleur de la note" aria-expanded={panel === 'color'} onClick={() => setPanel(panel === 'color' ? null : 'color')}>
            <Paintbrush aria-hidden className="size-5" />
          </IconButton>
          <IconButton label="Étiquettes" aria-expanded={panel === 'tags'} onClick={() => setPanel(panel === 'tags' ? null : 'tags')}>
            <Tag aria-hidden className="size-5" />
          </IconButton>
          <IconButton label="Mettre à la corbeille" onClick={() => void trash()}>
            <Trash2 aria-hidden className="size-5" />
          </IconButton>
        </div>

        {panel === 'color' && (
          <div className="flex flex-wrap gap-2 px-4 py-2" role="radiogroup" aria-label="Couleur de la note">
            {NOTE_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                role="radio"
                aria-checked={meta.color === color.id}
                aria-label={color.label}
                title={color.label}
                onClick={() => updateMeta({ color: color.id })}
                className="size-9 rounded-full border border-border aria-checked:ring-2 aria-checked:ring-accent aria-checked:ring-offset-2"
                style={{ background: noteBackground(color.id) }}
              />
            ))}
          </div>
        )}

        {panel === 'tags' && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2">
            {tags.map((tag) => {
              const active = meta.tag_ids.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateMeta({ tag_ids: active ? meta.tag_ids.filter((id) => id !== tag.id) : [...meta.tag_ids, tag.id] })}
                  className="min-h-9 rounded-full border px-3 text-sm font-medium"
                  style={{ borderColor: tag.color, background: active ? tag.color : 'transparent', color: active ? 'white' : tag.color }}
                >
                  #{tag.name}
                </button>
              )
            })}
            <input
              value={newTag}
              aria-label="Nouvelle étiquette"
              placeholder="+ étiquette"
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void addTag()}
              className="min-h-9 w-32 rounded-full border border-dashed border-border bg-transparent px-3 text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        {editor && <EditorToolbar editor={editor} />}
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 sm:px-8">
        <input
          aria-label="Titre de la note"
          value={title}
          placeholder="Titre"
          onChange={(event) => {
            setTitle(event.target.value)
            titleRef.current = event.target.value
            schedule()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              editor?.commands.focus('start')
            }
          }}
          className="mb-3 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted/70 sm:text-3xl"
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
