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
}

export interface Settings {
  theme: ThemePreference
  timeZone: string
  preferences: Preferences
}

export type RealtimeTable = 'settings' | 'layouts' | 'notifications'
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
  /** Demande l'envoi immédiat des rappels échus (sans attendre la minute suivante). */
  dispatchNow(): Promise<void>

  /** Écoute les modifications faites ailleurs (autre appareil). Renvoie la fonction de désabonnement. */
  subscribe(table: RealtimeTable, onChange: (row: Record<string, unknown>, event: RealtimeEvent) => void): () => void
}
