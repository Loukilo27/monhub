import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/lora/latin-400.css'
import '@fontsource/lora/latin-400-italic.css'
import '@fontsource/lora/latin-700.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-400-italic.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-400-italic.css'
import '@fontsource/playfair-display/latin-700.css'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

/**
 * Polices proposées. Les fichiers sont inclus dans l'app (pas de Google Fonts) :
 * fonctionnent hors-ligne et rendus identiques sur PC et Android.
 */
export const NOTE_FONTS = [
  { label: 'Par défaut', value: '' },
  { label: 'Arrondie (Nunito)', value: 'Nunito, system-ui, sans-serif' },
  { label: 'Serif (Lora)', value: 'Lora, Georgia, serif' },
  { label: 'Élégante (Playfair)', value: '"Playfair Display", Georgia, serif' },
  { label: 'Manuscrite (Caveat)', value: 'Caveat, cursive' },
  { label: 'Machine à écrire (JetBrains Mono)', value: '"JetBrains Mono", ui-monospace, monospace' },
]

export const NOTE_FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

/** Couleurs de texte : lisibles sur fond clair comme sombre. */
export const TEXT_COLORS = ['#ef4444', '#f97316', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#64748b']

/** Surligneurs (semi-transparents, lisibles dans les deux thèmes). */
export const HIGHLIGHT_COLORS = [
  { label: 'Jaune', value: 'rgb(250 204 21 / 0.45)' },
  { label: 'Vert', value: 'rgb(74 222 128 / 0.4)' },
  { label: 'Bleu', value: 'rgb(96 165 250 / 0.4)' },
  { label: 'Rose', value: 'rgb(244 114 182 / 0.4)' },
  { label: 'Orange', value: 'rgb(251 146 60 / 0.45)' },
  { label: 'Violet', value: 'rgb(167 139 250 / 0.4)' },
]

export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
  }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder: 'Écris ta note…' }),
]
