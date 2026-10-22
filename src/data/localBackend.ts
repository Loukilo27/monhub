import type { Layout, LayoutKind } from '../home/types'
import type { Backend, Settings } from './backend'

/**
 * Données en localStorage, pour le mode démo (développement, tests de bout en bout).
 * Aucune donnée réelle : tout reste dans le navigateur.
 */
const PREFIX = 'monhub.demo.'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export const localBackend: Backend = {
  async loadSettings() {
    return read<Settings>('settings')
  },
  async saveSettings(patch) {
    const current = read<Settings>('settings') ?? { theme: 'system', timeZone: 'Europe/Paris', preferences: {} }
    write('settings', { ...current, ...patch })
  },
  async loadLayout(kind: LayoutKind) {
    return read<Layout>(`layout.${kind}`)
  },
  async saveLayout(kind: LayoutKind, layout: Layout) {
    write(`layout.${kind}`, layout)
  },
  async uploadWallpaper(image) {
    const path = `demo/fond-${Date.now()}`
    write(`file.${path}`, await blobToDataUrl(image))
    return path
  },
  async deleteWallpaper(path) {
    localStorage.removeItem(`${PREFIX}file.${path}`)
  },
  async wallpaperUrl(path) {
    const url = read<string>(`file.${path}`)
    if (!url) throw new Error('Fond d’écran introuvable.')
    return url
  },
  subscribe() {
    return () => {}
  },
}
