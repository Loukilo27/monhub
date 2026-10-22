import type { Layout, LayoutKind } from '../home/types'
import type { ThemePreference } from '../theme/theme'

export type Wallpaper =
  | { type: 'default' }
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; path: string }

/** Préférences libres stockées dans settings.preferences (complétées au fil des phases). */
export interface Preferences {
  wallpaper?: Wallpaper
}

export interface Settings {
  theme: ThemePreference
  timeZone: string
  preferences: Preferences
}

export type RealtimeTable = 'settings' | 'layouts'

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
  /** Écoute les modifications faites ailleurs (autre appareil). Renvoie la fonction de désabonnement. */
  subscribe(table: RealtimeTable, onChange: (row: Record<string, unknown>) => void): () => void
}
