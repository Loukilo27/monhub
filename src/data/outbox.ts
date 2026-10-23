import type { Layout, LayoutKind } from '../home/types'
import type { AppTable, Backend, NewReminder, Settings } from './backend'

/**
 * File d'attente hors-ligne.
 *
 * Sans réseau, les modifications (lignes, réglages, disposition, rappels…) sont mises en file,
 * conservées dans le navigateur, puis envoyées dans l'ordre au retour de la connexion.
 * L'interface reste à jour entre-temps grâce aux mises à jour optimistes de TanStack Query.
 * Chaque modification garde l'heure à laquelle elle a été faite : la base ignore celles qui sont
 * plus anciennes que la version enregistrée (« la dernière modification gagne »).
 *
 * Les fichiers (dessins, fond d'écran) et les Edge Functions (assistant, musique) demandent le réseau.
 */

export type Operation =
  | { type: 'upsertRows'; table: AppTable; rows: { id: string }[]; editedAt: string }
  | { type: 'deleteRows'; table: AppTable; ids: string[] }
  | { type: 'saveSettings'; patch: Partial<Settings>; editedAt: string }
  | { type: 'saveLayout'; kind: LayoutKind; layout: Layout; editedAt: string }
  | { type: 'createReminder'; reminder: Omit<NewReminder, 'sendAt'> & { sendAt: string } }
  | { type: 'cancelReminders'; refId: string }
  | { type: 'markNotificationsRead'; ids: string[] | 'all' }
  | { type: 'clearNotifications' }

interface Entry {
  id: string
  op: Operation
  /** Échecs autres que réseau (session en cours de renouvellement…) : abandon au-delà de MAX_ATTEMPTS. */
  attempts: number
}

export interface FlushResult {
  sent: number
  /** Modifications refusées par le serveur, abandonnées. */
  failed: number
}

const STORAGE_KEY = 'monhub.outbox'
const MAX_ATTEMPTS = 5
const RETRY_MS = 30_000

/** Erreur due au réseau (hors-ligne, serveur injoignable) : la modification sera renvoyée plus tard. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|networkerror|load failed|fetch failed|network request failed|failed to send a request/i.test(message)
}

/** Erreur passagère d'authentification (jeton en cours de renouvellement) : on réessaie un peu plus tard. */
function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /jwt|session/i.test(message)
}

function apply(inner: Backend, op: Operation): Promise<void> {
  switch (op.type) {
    case 'upsertRows':
      return inner.upsertRows(op.table, op.rows, op.editedAt)
    case 'deleteRows':
      return inner.deleteRows(op.table, op.ids)
    case 'saveSettings':
      return inner.saveSettings(op.patch, op.editedAt)
    case 'saveLayout':
      return inner.saveLayout(op.kind, op.layout, op.editedAt)
    case 'createReminder':
      return inner.createReminder({ ...op.reminder, sendAt: new Date(op.reminder.sendAt) })
    case 'cancelReminders':
      return inner.cancelReminders(op.refId)
    case 'markNotificationsRead':
      return inner.markNotificationsRead(op.ids)
    case 'clearNotifications':
      return inner.clearNotifications()
  }
}

/**
 * Fusionne une modification avec la dernière de la file quand elles portent sur la même ligne
 * (ex. une note tapée hors-ligne : une seule écriture au lieu d'une par seconde).
 */
export function compact(last: Operation | undefined, next: Operation): Operation | null {
  if (last?.type === 'upsertRows' && next.type === 'upsertRows' && last.table === next.table && last.rows.length === 1 && next.rows.length === 1 && last.rows[0].id === next.rows[0].id) {
    return { ...next, rows: [{ ...last.rows[0], ...next.rows[0] }] }
  }
  if (last?.type === 'saveLayout' && next.type === 'saveLayout' && last.kind === next.kind) return next
  if (last?.type === 'saveSettings' && next.type === 'saveSettings') return { ...next, patch: { ...last.patch, ...next.patch } }
  return null
}

export class Outbox {
  private entries: Entry[]
  private listeners = new Set<() => void>()
  private flushedListeners = new Set<(result: FlushResult) => void>()
  private flushing: Promise<void> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private inner: Backend
  private storage: Storage | undefined

  constructor(inner: Backend, storage: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage) {
    this.inner = inner
    this.storage = storage
    this.entries = this.load()
    if (typeof window !== 'undefined') window.addEventListener('online', () => void this.flush())
    if (this.entries.length) this.scheduleRetry(1_000)
  }

  get size(): number {
    return this.entries.length
  }

  /** Prévenu à chaque changement de la file (indicateur « modifications en attente »). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Prévenu quand des modifications en attente viennent d'être envoyées (ou refusées). */
  onFlushed(listener: (result: FlushResult) => void): () => void {
    this.flushedListeners.add(listener)
    return () => this.flushedListeners.delete(listener)
  }

  /** Exécute une modification, ou la met en file si le réseau manque (ou si d'autres attendent déjà). */
  async run(op: Operation): Promise<void> {
    if (this.entries.length || !isOnline()) {
      this.push(op)
      return
    }
    try {
      await apply(this.inner, op)
    } catch (error) {
      if (!isNetworkError(error)) throw error
      this.push(op)
    }
  }

  /** Attend l'envoi des modifications en attente avant une lecture (pour ne pas les « effacer » à l'écran). */
  async idle(): Promise<void> {
    if (this.entries.length && isOnline()) await this.flush()
  }

  /** Envoie les modifications en attente, dans l'ordre. */
  flush(): Promise<void> {
    this.flushing ??= this.drain().finally(() => {
      this.flushing = null
    })
    return this.flushing
  }

  /** Vide la file (déconnexion). */
  clear() {
    this.entries = []
    this.save()
  }

  private async drain() {
    clearTimeout(this.retryTimer)
    const result: FlushResult = { sent: 0, failed: 0 }
    while (this.entries.length && isOnline()) {
      const entry = this.entries[0]
      try {
        await apply(this.inner, entry.op)
        result.sent++
      } catch (error) {
        if (isNetworkError(error)) break
        if (isRetryable(error) && entry.attempts + 1 < MAX_ATTEMPTS) {
          entry.attempts++
          this.save()
          break
        }
        result.failed++
      }
      this.entries.shift()
      this.save()
    }
    if (this.entries.length) this.scheduleRetry(RETRY_MS)
    if (result.sent || result.failed) this.flushedListeners.forEach((listener) => listener(result))
  }

  private push(op: Operation) {
    const merged = compact(this.entries.at(-1)?.op, op)
    if (merged) this.entries[this.entries.length - 1].op = merged
    else this.entries.push({ id: crypto.randomUUID(), op, attempts: 0 })
    this.save()
    this.scheduleRetry(isOnline() ? 0 : RETRY_MS)
  }

  private scheduleRetry(delay: number) {
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => void this.flush(), delay)
  }

  private load(): Entry[] {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Entry[]) : []
    } catch {
      return []
    }
  }

  private save() {
    try {
      if (this.entries.length) this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.entries))
      else this.storage?.removeItem(STORAGE_KEY)
    } catch {
      // Stockage plein : la file reste en mémoire tant que l'app est ouverte.
    }
    this.listeners.forEach((listener) => listener())
  }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

/** Enveloppe un accès aux données : écritures mises en file sans réseau, lectures après envoi de la file. */
export function withOutbox(inner: Backend, outbox: Outbox): Backend {
  const now = () => new Date().toISOString()
  return {
    ...inner,
    async loadSettings() {
      await outbox.idle()
      return inner.loadSettings()
    },
    saveSettings: (patch, editedAt = now()) => outbox.run({ type: 'saveSettings', patch, editedAt }),
    async loadLayout(kind) {
      await outbox.idle()
      return inner.loadLayout(kind)
    },
    saveLayout: (kind, layout, editedAt = now()) => outbox.run({ type: 'saveLayout', kind, layout, editedAt }),
    async listNotifications() {
      await outbox.idle()
      return inner.listNotifications()
    },
    markNotificationsRead: (ids) => outbox.run({ type: 'markNotificationsRead', ids }),
    clearNotifications: () => outbox.run({ type: 'clearNotifications' }),
    createReminder: (reminder) => outbox.run({ type: 'createReminder', reminder: { ...reminder, sendAt: reminder.sendAt.toISOString() } }),
    cancelReminders: (refId) => outbox.run({ type: 'cancelReminders', refId }),
    async listRows(table, options) {
      await outbox.idle()
      return inner.listRows(table, options)
    },
    upsertRows: (table, rows, editedAt = now()) => (rows.length ? outbox.run({ type: 'upsertRows', table, rows, editedAt }) : Promise.resolve()),
    deleteRows: (table, ids) => (ids.length ? outbox.run({ type: 'deleteRows', table, ids }) : Promise.resolve()),
  }
}
