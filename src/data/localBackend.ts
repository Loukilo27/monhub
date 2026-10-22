import type { Layout, LayoutKind } from '../home/types'
import type { AppNotification, AppTable, Backend, RealtimeEvent, Settings } from './backend'

const pendingReminders = new Map<string, ReturnType<typeof setTimeout>[]>()
const listeners = new Set<(row: Record<string, unknown>, event: RealtimeEvent) => void>()

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
  async listNotifications() {
    return read<AppNotification[]>('notifications') ?? []
  },
  async markNotificationsRead(ids) {
    const now = new Date().toISOString()
    const list = read<AppNotification[]>('notifications') ?? []
    write(
      'notifications',
      list.map((item) => (ids === 'all' || ids.includes(item.id) ? { ...item, readAt: item.readAt ?? now } : item)),
    )
  },
  async clearNotifications() {
    write('notifications', [])
  },
  async listPushDevices() {
    return []
  },
  async savePushSubscription() {},
  async deletePushDevice() {},
  async createReminder(reminder) {
    // Démo : la notification apparaît à l'heure prévue si l'onglet est ouvert.
    const deliver = () => {
      const notification: AppNotification = {
        id: crypto.randomUUID(),
        source: reminder.source,
        kind: reminder.kind,
        title: reminder.title,
        body: reminder.body ?? '',
        url: reminder.url ?? '/',
        refId: reminder.refId ?? null,
        readAt: null,
        createdAt: new Date().toISOString(),
      }
      write('notifications', [notification, ...(read<AppNotification[]>('notifications') ?? [])])
      const row = { ...notification, ref_id: notification.refId, read_at: null, created_at: notification.createdAt }
      listeners.forEach((listener) => listener(row, 'INSERT'))
    }
    const timeout = setTimeout(deliver, Math.max(0, reminder.sendAt.getTime() - Date.now()))
    if (reminder.refId) pendingReminders.set(reminder.refId, [...(pendingReminders.get(reminder.refId) ?? []), timeout])
  },
  async cancelReminders(refId) {
    pendingReminders.get(refId)?.forEach(clearTimeout)
    pendingReminders.delete(refId)
  },
  async dispatchNow() {},
  async listRows<T extends { id: string }>(table: AppTable) {
    return read<T[]>(`rows.${table}`) ?? []
  },
  async upsertRows<T extends { id: string }>(table: AppTable, rows: T[]) {
    const byId = new Map((read<T[]>(`rows.${table}`) ?? []).map((row) => [row.id, row]))
    for (const row of rows) byId.set(row.id, { ...byId.get(row.id), ...row })
    write(`rows.${table}`, [...byId.values()])
  },
  async deleteRows(table, ids) {
    write(`rows.${table}`, (read<{ id: string }[]>(`rows.${table}`) ?? []).filter((row) => !ids.includes(row.id)))
  },
  async uploadFile(bucket, name, data) {
    write(`file.${bucket}/${name}`, await blobToDataUrl(data))
  },
  async downloadFile(bucket, name) {
    const url = read<string>(`file.${bucket}/${name}`)
    if (!url) throw new Error('Fichier introuvable.')
    return (await fetch(url)).blob()
  },
  async fileUrls(bucket, names) {
    return Object.fromEntries(names.map((name) => [name, read<string>(`file.${bucket}/${name}`)]).filter(([, url]) => url)) as Record<string, string>
  },
  async removeFiles(bucket, names) {
    for (const name of names) localStorage.removeItem(`${PREFIX}file.${bucket}/${name}`)
  },
  subscribe(table, onChange) {
    if (table !== 'notifications') return () => {}
    listeners.add(onChange)
    return () => listeners.delete(onChange)
  },
}
