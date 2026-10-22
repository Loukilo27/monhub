import { Copy, Download, ImageOff, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { IconButton } from '../../components/IconButton'
import { buttonPrimary, buttonSecondary, inputBase, Modal } from '../../components/Modal'
import { useToast } from '../../components/toast'
import { formatRelative } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { exportPng, useDrawingActions, useDrawings, useThumbnails, fileNames } from './data'
import { PaintEditor } from './PaintEditor'
import { CANVAS_FORMATS, type Drawing } from './types'

function NewDrawingDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (format: (typeof CANVAS_FORMATS)[number], title: string) => void }) {
  const [format, setFormat] = useState<(typeof CANVAS_FORMATS)[number]>(CANVAS_FORMATS[0])
  const [title, setTitle] = useState('')
  return (
    <Modal
      title="Nouveau dessin"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Annuler
          </button>
          <button type="button" onClick={() => onCreate(format, title.trim())} className={buttonPrimary}>
            Créer
          </button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <input autoFocus aria-label="Titre" placeholder="Titre (facultatif)" value={title} onChange={(event) => setTitle(event.target.value)} className={inputBase} />
        <div role="radiogroup" aria-label="Format" className="grid grid-cols-3 gap-2">
          {CANVAS_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={format.id === item.id}
              onClick={() => setFormat(item)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-sm font-medium aria-checked:border-2 aria-checked:border-accent"
            >
              <span aria-hidden className="rounded-sm border-2 border-current" style={{ width: item.width / 40, height: item.height / 40 }} />
              {item.label}
              <span className="text-xs font-normal text-muted">
                {item.width}×{item.height}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function DrawingCard({ drawing, thumb, now, onOpen }: { drawing: Drawing; thumb?: string; now: Date; onOpen: () => void }) {
  const actions = useDrawingActions()
  const toast = useToast()
  const [menu, setMenu] = useState(false)
  const name = drawing.title || 'Sans titre'

  const run = (task: () => Promise<unknown>, success?: string) => {
    setMenu(false)
    task()
      .then(() => success && toast(success, 'success'))
      .catch(() => toast('L’opération a échoué.', 'error'))
  }

  return (
    <li className="relative">
      <button type="button" onClick={onOpen} className="group block w-full overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-soft">
        <span className="grid aspect-[4/3] place-items-center overflow-hidden bg-surface-2">
          {thumb ? (
            <img src={thumb} alt="" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.03]" />
          ) : (
            <ImageOff aria-hidden className="size-8 text-muted" />
          )}
        </span>
        <span className="block px-3 pt-2 pr-10 font-medium">
          <span className="block truncate">{name}</span>
        </span>
        <span className="block px-3 pb-2 text-xs text-muted">{drawing.updated_at ? formatRelative(new Date(drawing.updated_at), now) : ''}</span>
      </button>
      <IconButton label={`Actions pour « ${name} »`} aria-expanded={menu} onClick={() => setMenu((value) => !value)} className="absolute! right-1 bottom-1">
        <MoreVertical aria-hidden className="size-5" />
      </IconButton>
      {menu && (
        <ul role="menu" className="absolute right-1 bottom-12 z-10 w-52 rounded-2xl border border-border bg-surface p-1 shadow-soft">
          {[
            {
              label: 'Renommer',
              icon: Pencil,
              action: () => {
                const title = prompt('Nouveau titre', drawing.title)
                if (title !== null) run(() => actions.renameDrawing(drawing, title.trim()))
                else setMenu(false)
              },
            },
            { label: 'Dupliquer', icon: Copy, action: () => run(() => actions.duplicateDrawing(drawing), 'Dessin dupliqué.') },
            { label: 'Exporter en PNG', icon: Download, action: () => run(() => exportPng(drawing)), disabled: drawing.version === 0 },
            {
              label: 'Supprimer',
              icon: Trash2,
              danger: true,
              action: () => {
                if (confirm(`Supprimer définitivement « ${name} » ?`)) run(() => actions.deleteDrawing(drawing), 'Dessin supprimé.')
                else setMenu(false)
              },
            },
          ].map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={item.action}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-2 disabled:opacity-40 ${item.danger ? 'text-danger' : ''}`}
              >
                <item.icon aria-hidden className="size-4" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Mini Paint : galerie des dessins, ou l'éditeur (#/app/paint?drawing=<id>). */
export default function PaintPage() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('drawing')
  const now = useNowMinute()
  const { drawings, loaded } = useDrawings()
  const thumbs = useThumbnails(drawings)
  const actions = useDrawingActions()
  const [creating, setCreating] = useState(false)
  const [fresh, setFresh] = useState<Drawing | null>(null)

  const open = drawings.find((drawing) => drawing.id === openId) ?? (fresh?.id === openId ? fresh : null)
  if (openId && open) {
    return (
      <PaintEditor
        key={open.id}
        drawing={open}
        onBack={() => {
          setFresh(null)
          setParams({})
        }}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="flex-1 text-2xl font-semibold">Mes dessins</h2>
        <button type="button" onClick={() => setCreating(true)} className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-contrast">
          <Plus aria-hidden className="size-5" />
          Nouveau dessin
        </button>
      </div>
      {loaded && drawings.length === 0 ? (
        <p className="py-16 text-center text-muted">Aucun dessin pour l’instant.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {drawings.map((drawing) => (
            <DrawingCard
              key={drawing.id}
              drawing={drawing}
              thumb={drawing.version > 0 ? thumbs[fileNames(drawing).thumb] : undefined}
              now={now}
              onOpen={() => setParams({ drawing: drawing.id })}
            />
          ))}
        </ul>
      )}
      {creating && (
        <NewDrawingDialog
          onClose={() => setCreating(false)}
          onCreate={async (format, title) => {
            setCreating(false)
            const drawing = await actions.createDrawing(format, title)
            setFresh(drawing)
            setParams({ drawing: drawing.id })
          }}
        />
      )}
    </div>
  )
}
