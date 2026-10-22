import {
  ArrowLeft,
  Brush,
  Check,
  Circle,
  CloudOff,
  Download,
  Eraser,
  Expand,
  LoaderCircle,
  type LucideIcon,
  Minus,
  PaintBucket,
  Pipette,
  Plus,
  Redo2,
  Slash,
  Square,
  Type,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { useToast } from '../../components/toast'
import { exportPng, loadDoc, useDrawingActions } from './data'
import { rgbToHex } from './floodFill'
import { EMPTY_HISTORY, push, redo, undo, type History } from './history'
import { applyOp, canvasToBlob, flatten, replay } from './render'
import { PALETTE, type Drawing, type PaintOp, type StrokePoint, type Tool } from './types'

const TOOLS: { id: Tool; label: string; icon: LucideIcon; key: string }[] = [
  { id: 'brush', label: 'Pinceau', icon: Brush, key: 'b' },
  { id: 'eraser', label: 'Gomme', icon: Eraser, key: 'e' },
  { id: 'bucket', label: 'Pot de peinture', icon: PaintBucket, key: 'g' },
  { id: 'eyedropper', label: 'Pipette', icon: Pipette, key: 'i' },
  { id: 'line', label: 'Ligne', icon: Slash, key: 'l' },
  { id: 'rect', label: 'Rectangle', icon: Square, key: 'r' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, key: 'o' },
  { id: 'text', label: 'Texte', icon: Type, key: 't' },
]

const FONTS = [
  { label: 'Sans', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Manuscrite', value: 'Caveat, "Segoe Print", cursive' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
]

const AUTOSAVE_DELAY_MS = 1500
type SaveState = 'saved' | 'pending' | 'saving' | 'error'

interface Gesture {
  pointers: Map<number, { x: number; y: number }>
  start?: { distance: number; mid: { x: number; y: number }; zoom: number; pan: { x: number; y: number } }
}

export function PaintEditor({ drawing: initial, onBack }: { drawing: Drawing; onBack: () => void }) {
  const actions = useDrawingActions()
  const toast = useToast()
  const [drawing, setDrawing] = useState(initial)
  const drawingRef = useRef(initial)
  const [loaded, setLoaded] = useState(false)
  const [history, setHistory] = useState<History>(EMPTY_HISTORY)
  const [background, setBackground] = useState(initial.background)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#111827')
  const [size, setSize] = useState(12)
  const [opacity, setOpacity] = useState(1)
  const [filled, setFilled] = useState(false)
  const [font, setFont] = useState(FONTS[0].value)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [text, setText] = useState<{ x: number; y: number; value: string } | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')

  const viewportRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement | null>(null)
  const appliedRef = useRef<PaintOp[]>([])
  const currentRef = useRef<PaintOp | null>(null)
  const gestureRef = useRef<Gesture>({ pointers: new Map() })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const savingRef = useRef<Promise<void> | null>(null)
  const latestRef = useRef({ history, background })
  useEffect(() => {
    latestRef.current = { history, background }
  })

  const { width, height } = drawing

  // ---------- Chargement ----------

  useEffect(() => {
    let cancelled = false
    const ink = document.createElement('canvas')
    ink.width = initial.width
    ink.height = initial.height
    inkRef.current = ink
    loadDoc(initial)
      .then((doc) => {
        if (cancelled) return
        setBackground(doc.background)
        setHistory({ ops: doc.ops, undone: [] })
        setLoaded(true)
      })
      .catch(() => {
        toast('Impossible d’ouvrir ce dessin.', 'error')
        onBack()
      })
    return () => {
      cancelled = true
    }
    // Chargé une seule fois par dessin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id])

  // ---------- Rendu ----------

  const paintBase = useCallback(() => {
    const base = baseRef.current?.getContext('2d')
    const ink = inkRef.current
    if (!base || !ink) return
    base.fillStyle = background
    base.fillRect(0, 0, width, height)
    base.drawImage(ink, 0, 0)
  }, [background, width, height])

  // Applique l'historique au calque d'encre : à la suite si on a seulement ajouté, sinon on rejoue tout.
  useLayoutEffect(() => {
    const ink = inkRef.current?.getContext('2d', { willReadFrequently: true })
    if (!ink || !loaded) return
    const applied = appliedRef.current
    const appended = history.ops.length === applied.length + 1 && applied.every((op, index) => op === history.ops[index])
    if (appended) applyOp(ink, background, history.ops[history.ops.length - 1])
    else if (history.ops !== applied) replay(ink, background, history.ops)
    appliedRef.current = history.ops
    paintBase()
  }, [history.ops, background, loaded, paintBase])

  // Le fond influe sur le pot de peinture : on rejoue tout quand il change.
  useEffect(() => {
    const ink = inkRef.current?.getContext('2d', { willReadFrequently: true })
    if (!ink || !loaded) return
    replay(ink, background, appliedRef.current)
    paintBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background])

  const drawPreview = () => {
    const overlay = overlayRef.current?.getContext('2d')
    if (!overlay) return
    overlay.clearRect(0, 0, width, height)
    const op = currentRef.current
    if (!op) return
    // Aperçu de la gomme : couleur du fond.
    applyOp(overlay, background, op.type === 'stroke' && op.erase ? { ...op, erase: false, color: background, opacity: 1 } : op)
  }

  // ---------- Sauvegarde automatique ----------

  const save = useCallback(async () => {
    clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    if (savingRef.current) await savingRef.current
    const ink = inkRef.current
    if (!ink) return
    setSaveState('saving')
    const { history: current, background: bg } = latestRef.current
    const task = actions
      .saveDrawing(drawingRef.current, { width: drawingRef.current.width, height: drawingRef.current.height, background: bg, ops: current.ops }, ink)
      .then((next) => {
        drawingRef.current = next
        setDrawing(next)
        setSaveState((state) => (state === 'saving' ? 'saved' : state))
      })
      .catch(() => setSaveState('error'))
      .finally(() => {
        savingRef.current = null
      })
    savingRef.current = task
    await task
  }, [actions])
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  const scheduleSave = () => {
    setSaveState('pending')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveRef.current(), AUTOSAVE_DELAY_MS)
  }

  useEffect(() => {
    const flushIfPending = () => {
      if (saveTimer.current) void saveRef.current()
    }
    window.addEventListener('pagehide', flushIfPending)
    document.addEventListener('visibilitychange', flushIfPending)
    window.addEventListener('online', flushIfPending)
    return () => {
      window.removeEventListener('pagehide', flushIfPending)
      document.removeEventListener('visibilitychange', flushIfPending)
      window.removeEventListener('online', flushIfPending)
      flushIfPending()
    }
  }, [])

  const commit = (op: PaintOp) => {
    setHistory((current) => push(current, op))
    scheduleSave()
  }
  const doUndo = () => {
    setHistory(undo)
    scheduleSave()
  }
  const doRedo = () => {
    setHistory(redo)
    scheduleSave()
  }

  // ---------- Zoom ----------

  const fit = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const { clientWidth: vw, clientHeight: vh } = viewport
    const next = Math.min((vw - 24) / width, (vh - 24) / height, 4)
    setZoom(next)
    setPan({ x: (vw - width * next) / 2, y: (vh - height * next) / 2 })
  }, [width, height])

  useLayoutEffect(() => {
    fit()
  }, [fit, loaded])

  /** Zoom autour d'un point de l'écran (relatif à la zone de dessin). */
  const zoomAt = (factor: number, cx: number, cy: number) => {
    setZoom((current) => {
      const next = Math.min(8, Math.max(0.1, current * factor))
      setPan((p) => ({ x: cx - ((cx - p.x) * next) / current, y: cy - ((cy - p.y) * next) / current }))
      return next
    })
  }
  const zoomCenter = (factor: number) => {
    const viewport = viewportRef.current
    if (viewport) zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2)
  }

  // ---------- Pointeur ----------

  const toDoc = (event: { clientX: number; clientY: number }) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }
  }

  const pressureOf = (event: PointerEvent | React.PointerEvent) => (event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5)

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || text) return
    const gesture = gestureRef.current
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)

    // Deux doigts : zoom / déplacement, le tracé en cours est abandonné.
    if (gesture.pointers.size === 2) {
      currentRef.current = null
      drawPreview()
      const [a, b] = [...gesture.pointers.values()]
      const viewport = viewportRef.current!.getBoundingClientRect()
      gesture.start = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2 - viewport.left, y: (a.y + b.y) / 2 - viewport.top },
        zoom,
        pan,
      }
      return
    }
    if (gesture.pointers.size > 2 || (event.pointerType === 'mouse' && event.button !== 0)) return

    const { x, y } = toDoc(event)
    switch (tool) {
      case 'brush':
      case 'eraser':
        currentRef.current = {
          type: 'stroke',
          erase: tool === 'eraser',
          color,
          size: tool === 'eraser' ? size * 2 : size,
          opacity,
          pressure: event.pointerType === 'pen',
          points: [[x, y, pressureOf(event)]],
        }
        break
      case 'line':
      case 'rect':
      case 'ellipse':
        currentRef.current = { type: 'shape', shape: tool, color, size: Math.max(1, size / 2), opacity, filled, x1: x, y1: y, x2: x, y2: y }
        break
      case 'eyedropper': {
        const pixel = baseRef.current!.getContext('2d')!.getImageData(Math.floor(x), Math.floor(y), 1, 1).data
        setColor(rgbToHex(pixel[0], pixel[1], pixel[2]))
        setTool('brush')
        return
      }
      case 'bucket':
        commit({ type: 'fill', x, y, color })
        return
      case 'text':
        // Sans cela, la fin du clic sur le dessin retirerait le focus de la zone de texte.
        event.preventDefault()
        setText({ x, y, value: '' })
        return
    }
    drawPreview()
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    if (!gesture.pointers.has(event.pointerId)) return
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (gesture.start && gesture.pointers.size === 2) {
      const [a, b] = [...gesture.pointers.values()]
      const viewport = viewportRef.current!.getBoundingClientRect()
      const mid = { x: (a.x + b.x) / 2 - viewport.left, y: (a.y + b.y) / 2 - viewport.top }
      const start = gesture.start
      const nextZoom = Math.min(8, Math.max(0.1, (start.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / start.distance))
      // Le point du dessin sous les doigts au départ reste sous les doigts.
      const docX = (start.mid.x - start.pan.x) / start.zoom
      const docY = (start.mid.y - start.pan.y) / start.zoom
      setZoom(nextZoom)
      setPan({ x: mid.x - docX * nextZoom, y: mid.y - docY * nextZoom })
      return
    }

    const op = currentRef.current
    if (!op) return
    if (op.type === 'stroke') {
      // Événements groupés : tracé plus fluide avec un stylet ou une souris rapide.
      const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent]
      for (const item of events.length ? events : [event.nativeEvent]) {
        const point = toDoc(item)
        op.points.push([point.x, point.y, pressureOf(item)] as StrokePoint)
      }
    } else if (op.type === 'shape') {
      const point = toDoc(event)
      op.x2 = point.x
      op.y2 = point.y
      // Maj : carré, cercle, ligne à 45°.
      if (event.shiftKey) {
        const side = Math.max(Math.abs(op.x2 - op.x1), Math.abs(op.y2 - op.y1))
        op.x2 = op.x1 + Math.sign(op.x2 - op.x1 || 1) * side
        op.y2 = op.y1 + Math.sign(op.y2 - op.y1 || 1) * side
      }
    }
    drawPreview()
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    gesture.pointers.delete(event.pointerId)
    if (gesture.start) {
      if (gesture.pointers.size === 0) gesture.start = undefined
      return
    }
    const op = currentRef.current
    currentRef.current = null
    drawPreview()
    if (op && (op.type !== 'shape' || Math.hypot(op.x2 - op.x1, op.y2 - op.y1) > 2)) commit(op)
  }

  const onWheel = (event: React.WheelEvent) => {
    const rect = viewportRef.current!.getBoundingClientRect()
    if (event.ctrlKey || event.metaKey) zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top)
    else setPan((p) => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }))
  }

  // Empêche le zoom de la page avec Ctrl + molette (géré par la zone de dessin).
  useEffect(() => {
    const viewport = viewportRef.current
    const block = (event: WheelEvent) => event.preventDefault()
    viewport?.addEventListener('wheel', block, { passive: false })
    return () => viewport?.removeEventListener('wheel', block)
  }, [])

  // ---------- Texte ----------

  const commitText = () => {
    if (text?.value.trim()) commit({ type: 'text', text: text.value, x: text.x, y: text.y, color, size: Math.max(12, size * 3), font })
    setText(null)
  }

  // ---------- Raccourcis clavier ----------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        doUndo()
      } else if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault()
        doRedo()
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const match = TOOLS.find((item) => item.key === key)
        if (match) setTool(match.id)
        else if (key === '+' || key === '=') zoomCenter(1.25)
        else if (key === '-') zoomCenter(0.8)
        else if (key === '0') fit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const exportNow = async () => {
    if (!inkRef.current) return
    await exportPng(drawingRef.current, await canvasToBlob(flatten(inkRef.current, background), 'image/png'))
  }

  const status = {
    saved: { icon: Check, text: 'Enregistré', className: 'text-muted' },
    pending: { icon: LoaderCircle, text: 'Modifications…', className: 'text-muted' },
    saving: { icon: LoaderCircle, text: 'Enregistrement…', className: 'text-muted' },
    error: { icon: CloudOff, text: 'Non enregistré — nouvel essai à la reconnexion', className: 'text-danger' },
  }[saveState]

  const toolButton = (item: (typeof TOOLS)[number]) => (
    <IconButton
      key={item.id}
      label={`${item.label} (${item.key.toUpperCase()})`}
      aria-pressed={tool === item.id}
      onClick={() => setTool(item.id)}
      className="rounded-xl! aria-pressed:bg-accent! aria-pressed:text-accent-contrast!"
    >
      <item.icon aria-hidden className="size-5" />
    </IconButton>
  )

  return (
    <div className="flex h-[calc(100dvh-3.25rem-env(safe-area-inset-top))] flex-col">
      {/* Barre du haut */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <IconButton label="Retour à la galerie" onClick={onBack}>
          <ArrowLeft aria-hidden className="size-5" />
        </IconButton>
        <input
          aria-label="Titre du dessin"
          value={drawing.title}
          placeholder="Sans titre"
          onChange={(event) => {
            const next = { ...drawingRef.current, title: event.target.value }
            drawingRef.current = next
            setDrawing(next)
          }}
          onBlur={() => void actions.renameDrawing(drawingRef.current, drawingRef.current.title)}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-medium outline-none focus:bg-surface-2 sm:max-w-64"
        />
        <span role="status" aria-live="polite" className={`hidden items-center gap-1.5 text-xs sm:flex ${status.className}`}>
          <status.icon aria-hidden className={`size-3.5 ${saveState === 'saving' || saveState === 'pending' ? 'animate-spin' : ''}`} />
          {status.text}
        </span>
        <span className="flex-1" />
        <IconButton label="Annuler (Ctrl+Z)" disabled={!history.ops.length} onClick={doUndo}>
          <Undo2 aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Rétablir (Ctrl+Y)" disabled={!history.undone.length} onClick={doRedo}>
          <Redo2 aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Exporter en PNG" onClick={() => void exportNow()}>
          <Download aria-hidden className="size-5" />
        </IconButton>
      </div>

      {/* Options de l'outil */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5 text-sm">
        <div className="flex items-center gap-1" role="group" aria-label="Couleurs">
          {PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Couleur ${swatch}`}
              aria-pressed={color === swatch}
              onClick={() => setColor(swatch)}
              className="size-6 shrink-0 rounded-full border border-border aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-1 max-sm:[&:nth-child(n+9)]:hidden"
              style={{ background: swatch }}
            />
          ))}
          <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-border" title="Autre couleur" style={{ background: color }}>
            <span className="sr-only">Autre couleur</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 opacity-0" />
          </label>
        </div>
        <label className="flex items-center gap-2">
          Taille
          <input type="range" min={1} max={80} value={size} onChange={(event) => setSize(Number(event.target.value))} className="w-24 accent-[var(--accent)]" />
          <span className="w-6 tabular-nums">{size}</span>
        </label>
        {tool !== 'eraser' && tool !== 'text' && tool !== 'bucket' && (
          <label className="flex items-center gap-2">
            Opacité
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(opacity * 100)}
              onChange={(event) => setOpacity(Number(event.target.value) / 100)}
              className="w-20 accent-[var(--accent)]"
            />
            <span className="w-9 tabular-nums">{Math.round(opacity * 100)} %</span>
          </label>
        )}
        {(tool === 'rect' || tool === 'ellipse') && (
          <label className="flex min-h-9 items-center gap-2">
            <input type="checkbox" checked={filled} onChange={(event) => setFilled(event.target.checked)} className="size-4 accent-[var(--accent)]" />
            Rempli
          </label>
        )}
        {tool === 'text' && (
          <select aria-label="Police du texte" value={font} onChange={(event) => setFont(event.target.value)} className="min-h-9 rounded-lg border border-border bg-surface px-2">
            {FONTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2">
          Fond
          <span className="relative size-7 overflow-hidden rounded-md border-2 border-border" style={{ background }}>
            <input
              type="color"
              aria-label="Couleur de fond"
              value={background}
              onChange={(event) => {
                setBackground(event.target.value)
                scheduleSave()
              }}
              className="absolute inset-0 opacity-0"
            />
          </span>
        </label>
      </div>

      <div className="flex min-h-0 flex-1 max-sm:flex-col-reverse">
        {/* Outils */}
        <div role="toolbar" aria-label="Outils" aria-orientation="vertical" className="flex shrink-0 gap-1 border-border p-1.5 max-sm:justify-center max-sm:border-t sm:flex-col sm:border-r">
          {TOOLS.map(toolButton)}
        </div>

        {/* Zone de dessin */}
        <div
          ref={viewportRef}
          onWheel={onWheel}
          className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--bg)_0_50%)] bg-[length:24px_24px]"
        >
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center text-muted">
              <LoaderCircle aria-label="Chargement du dessin" className="size-8 animate-spin" />
            </div>
          )}
          <div
            className="absolute top-0 left-0 origin-top-left shadow-soft"
            style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <canvas ref={baseRef} width={width} height={height} className="absolute inset-0 h-full w-full" aria-hidden />
            <canvas
              ref={overlayRef}
              width={width}
              height={height}
              role="img"
              aria-label={`Zone de dessin « ${drawing.title || 'Sans titre'} »`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`absolute inset-0 h-full w-full ${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
            />
            {text && (
              <textarea
                autoFocus
                aria-label="Texte à ajouter"
                value={text.value}
                onChange={(event) => setText({ ...text, value: event.target.value })}
                onBlur={commitText}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    commitText()
                  } else if (event.key === 'Escape') {
                    event.stopPropagation()
                    setText(null)
                  }
                }}
                placeholder="Texte…"
                className="absolute min-w-40 resize-none border border-dashed border-accent bg-transparent p-0 leading-tight outline-none"
                style={{ left: text.x, top: text.y, color, font: `${Math.max(12, size * 3)}px ${font}` }}
              />
            )}
          </div>

          <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1 shadow-soft backdrop-blur">
            <IconButton label="Dézoomer (-)" onClick={() => zoomCenter(0.8)} className="size-9!">
              <Minus aria-hidden className="size-4" />
            </IconButton>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)} %</span>
            <IconButton label="Zoomer (+)" onClick={() => zoomCenter(1.25)} className="size-9!">
              <Plus aria-hidden className="size-4" />
            </IconButton>
            <IconButton label="Ajuster à l’écran (0)" onClick={fit} className="size-9!">
              <Expand aria-hidden className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
