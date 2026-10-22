import type { Layout, LayoutKind } from '../home/types'
import type { ThemePreference } from '../theme/theme'

export type Wallpaper =
  | { type: 'default' }
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; path: string }

export interface QuietHours {
  enabled: boolean
  /** « HH:MM », heure locale. */
  start: string
  end: string
}

export interface NotificationPreferences {
  /** Mini-applis dont les notifications (push et toasts) sont coupées. */
  disabledApps?: string[]
  quietHours?: QuietHours
}

/** Préférences libres stockées dans settings.preferences (complétées au fil des phases). */
export interface Preferences {
  wallpaper?: Wallpaper
  notifications?: NotificationPreferences
}

export interface AppNotification {
  id: string
  source: string
  kind: string
  title: string
  body: string
  url: string
  /** Élément concerné (alarme, minuteur, tâche…). */
  refId: string | null
  readAt: string | null
  createdAt: string
}

export interface PushDevice {
  id: string
  endpoint: string
  deviceLabel: string
  lastSeenAt: string
  lastSuccessAt: string | null
}

export interface NewReminder {
  source: string
  kind: 'alarm' | 'timer' | 'task' | 'event' | 'test' | 'info'
  title: string
  body?: string
  url?: string
  actions?: ('snooze' | 'done')[]
  sendAt: Date
  refId?: string
  /** Pour un rappel « X minutes avant » une échéance. */
  offsetMinutes?: number
  /** Rappel reporté : ne reprogramme pas l'occurrence suivante d'une alarme. */
  snoozed?: boolean
}

export interface Settings {
  theme: ThemePreference
  timeZone: string
  preferences: Preferences
}

/** Tables des mini-applis, accessibles par l'API générique (listRows / upsertRows / deleteRows). */
export type AppTable = 'world_clocks' | 'alarms' | 'timers' | 'todo_lists' | 'tags' | 'tasks' | 'events' | 'notes' | 'drawings'

/** Buckets de fichiers privés (chaque utilisateur n'accède qu'à son dossier). */
export type FileBucket = 'drawings'

export type RealtimeTable = 'settings' | 'layouts' | 'notifications' | AppTable
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Accès aux données de l'app. Deux implémentations :
 * - Supabase (production) ;
 * - locale (mode démo pour le développement et les tests de bout en bout, sans compte).
 */
export interface Backend {
  loadSettings(): Promise<Settings | null>
  saveSettings(patch: Partial<Settings>): Promise<void>
  loadLayout(kind: LayoutKind): Promise<Layout | null>
  saveLayout(kind: LayoutKind, layout: Layout): Promise<void>
  uploadWallpaper(image: Blob): Promise<string>
  deleteWallpaper(path: string): Promise<void>
  wallpaperUrl(path: string): Promise<string>

  listNotifications(): Promise<AppNotification[]>
  /** Marque comme lues les notifications données, ou toutes. */
  markNotificationsRead(ids: string[] | 'all'): Promise<void>
  clearNotifications(): Promise<void>

  listPushDevices(): Promise<PushDevice[]>
  savePushSubscription(subscription: PushSubscriptionJSON, deviceLabel: string): Promise<void>
  deletePushDevice(id: string): Promise<void>

  createReminder(reminder: NewReminder): Promise<void>
  /** Annule les rappels pas encore envoyés d'un élément (alarme désactivée, minuteur en pause…). */
  cancelReminders(refId: string): Promise<void>
  /** Demande l'envoi immédiat des rappels échus (sans attendre la minute suivante). */
  dispatchNow(): Promise<void>

  listRows<T extends { id: string }>(table: AppTable): Promise<T[]>
  /** Crée ou met à jour des lignes (clé : id). */
  upsertRows<T extends { id: string }>(table: AppTable, rows: T[]): Promise<void>
  deleteRows(table: AppTable, ids: string[]): Promise<void>

  /** Fichiers du dossier de l'utilisateur dans un bucket privé (le nom est relatif à ce dossier). */
  uploadFile(bucket: FileBucket, name: string, data: Blob): Promise<void>
  downloadFile(bucket: FileBucket, name: string): Promise<Blob>
  /** Liens temporaires (1 h) pour afficher des fichiers. */
  fileUrls(bucket: FileBucket, names: string[]): Promise<Record<string, string>>
  removeFiles(bucket: FileBucket, names: string[]): Promise<void>

  /** Écoute les modifications faites ailleurs (autre appareil). Renvoie la fonction de désabonnement. */
  subscribe(table: RealtimeTable, onChange: (row: Record<string, unknown>, event: RealtimeEvent) => void): () => void
}
