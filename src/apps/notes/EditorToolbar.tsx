import { useEditorState, type Editor } from '@tiptap/react'
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { HIGHLIGHT_COLORS, NOTE_FONT_SIZES, NOTE_FONTS, TEXT_COLORS } from './editorConfig'

function ToolButton({ label, icon: Icon, active, disabled, onClick }: {
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Garde la sélection dans l'éditeur.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-lg text-text transition-colors hover:bg-surface-2 disabled:opacity-30 aria-pressed:bg-accent/15 aria-pressed:text-accent"
    >
      <Icon aria-hidden className="size-[18px]" />
    </button>
  )
}

function ColorMenu({ label, icon, current, children }: { label: string; icon: ReactNode; current?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-lg hover:bg-surface-2"
      >
        {icon}
        <span aria-hidden className="absolute inset-x-2.5 bottom-1.5 h-1 rounded-full" style={{ background: current ?? 'transparent' }} />
      </button>
      {open && (
        <span
          role="menu"
          aria-label={label}
          className="absolute top-11 left-0 z-20 flex w-56 flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-2 shadow-soft"
        >
          {children(() => setOpen(false))}
        </span>
      )}
    </span>
  )
}

const separator = <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border" />

/** Barre d'outils de mise en forme (police, taille, styles, couleurs, listes, liens…). */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      fontFamily: (e.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      fontSize: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      color: e.getAttributes('textStyle').color as string | undefined,
      highlight: e.getAttributes('highlight').color as string | undefined,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  const editLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = prompt('Adresse du lien (laisser vide pour retirer le lien)', previous ?? 'https://')
    if (url === null) return
    if (!url.trim() || url.trim() === 'https://') chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const selectClass = 'min-h-10 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm'

  return (
    <div role="toolbar" aria-label="Mise en forme" className="flex items-center gap-0.5 overflow-x-auto px-1 py-1 [scrollbar-width:thin]">
      <ToolButton label="Annuler (Ctrl+Z)" icon={Undo2} disabled={!state.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton label="Rétablir (Ctrl+Y)" icon={Redo2} disabled={!state.canRedo} onClick={() => chain().redo().run()} />
      {separator}
      <select
        aria-label="Police"
        value={state.fontFamily}
        onChange={(event) => (event.target.value ? chain().setFontFamily(event.target.value).run() : chain().unsetFontFamily().run())}
        className={`${selectClass} max-w-40`}
      >
        {NOTE_FONTS.map((font) => (
          <option key={font.label} value={font.value} style={{ fontFamily: font.value || undefined }}>
            {font.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Taille du texte"
        value={state.fontSize}
        onChange={(event) => (event.target.value ? chain().setFontSize(event.target.value).run() : chain().unsetFontSize().run())}
        className={`${selectClass} ml-1`}
      >
        <option value="">Taille</option>
        {NOTE_FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {parseInt(size)}
          </option>
        ))}
      </select>
      {separator}
      <ToolButton label="Gras (Ctrl+B)" icon={Bold} active={state.bold} onClick={() => chain().toggleBold().run()} />
      <ToolButton label="Italique (Ctrl+I)" icon={Italic} active={state.italic} onClick={() => chain().toggleItalic().run()} />
      <ToolButton label="Souligné (Ctrl+U)" icon={Underline} active={state.underline} onClick={() => chain().toggleUnderline().run()} />
      <ToolButton label="Barré" icon={Strikethrough} active={state.strike} onClick={() => chain().toggleStrike().run()} />
      <ColorMenu label="Couleur du texte" icon={<Palette aria-hidden className="size-[18px]" />} current={state.color}>
        {(close) => (
          <>
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Texte ${color}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  chain().setColor(color).run()
                  close()
                }}
                className="size-8 rounded-full border border-border"
                style={{ background: color }}
              />
            ))}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                chain().unsetColor().run()
                close()
              }}
              className="min-h-8 rounded-full border border-border px-3 text-xs"
            >
              Couleur par défaut
            </button>
          </>
        )}
      </ColorMenu>
      <ColorMenu label="Surligner" icon={<Highlighter aria-hidden className="size-[18px]" />} current={state.highlight}>
        {(close) => (
          <>
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={`Surligner en ${color.label.toLowerCase()}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  chain().toggleHighlight({ color: color.value }).run()
                  close()
                }}
                className="size-8 rounded-full border border-border"
                style={{ background: color.value }}
              />
            ))}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                chain().unsetHighlight().run()
                close()
              }}
              className="min-h-8 rounded-full border border-border px-3 text-xs"
            >
              Sans surlignage
            </button>
          </>
        )}
      </ColorMenu>
      {separator}
      <ToolButton label="Titre 1" icon={Heading1} active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="Titre 2" icon={Heading2} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="Titre 3" icon={Heading3} active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      {separator}
      <ToolButton label="Liste à puces" icon={List} active={state.bullet} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton label="Liste numérotée" icon={ListOrdered} active={state.ordered} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton label="Cases à cocher" icon={ListChecks} active={state.task} onClick={() => chain().toggleTaskList().run()} />
      <ToolButton label="Citation" icon={Quote} active={state.quote} onClick={() => chain().toggleBlockquote().run()} />
      <ToolButton label="Lien" icon={Link} active={state.link} onClick={editLink} />
      {separator}
      <ToolButton label="Effacer la mise en forme" icon={RemoveFormatting} onClick={() => chain().unsetAllMarks().clearNodes().run()} />
    </div>
  )
}
