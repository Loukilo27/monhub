import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { fileNames } from '../apps/paint/data'
import type { Drawing } from '../apps/paint/types'
import { backend } from '../data'
import type { AppTable, Settings } from '../data/backend'
import type { Layout, LayoutKind } from '../home/types'

/**
 * Sauvegarde complète dans un fichier ZIP :
 * - monhub.json : réglages, dispositions de l'accueil et toutes les lignes des mini-applis ;
 * - dessins/ : documents (historique des traits), images PNG et miniatures des dessins ;
 * - fond-ecran/ : l'image de fond importée, s'il y en a une.
 * Les notifications, rappels programmés et appareils abonnés n'en font pas partie : ils sont
 * recréés (rappels reprogrammés à la restauration, appareils à réabonner).
 */

export const BACKUP_FORMAT = 'monhub-sauvegarde'
export const BACKUP_VERSION = 1

/** Tables sauvegardées, dans l'ordre de restauration (les listes avant leurs tâches, etc.). */
export const BACKUP_TABLES: AppTable[] = [
  'todo_lists',
  'tags',
  'tasks',
  'events',
  'notes',
  'world_clocks',
  'alarms',
  'timers',
  'drawings',
  'music_playlists',
  'ai_conversations',
  'ai_messages',
]

const TABLE_LABELS: Record<string, string> = {
  todo_lists: 'listes',
  tags: 'étiquettes',
  tasks: 'tâches',
  events: 'agenda',
  notes: 'notes',
  world_clocks: 'fuseaux',
  alarms: 'alarmes',
  timers: 'minuteurs',
  drawings: 'dessins',
  music_playlists: 'playlists',
  ai_conversations: 'conversations',
  ai_messages: 'messages de l’assistant',
}

const LAYOUT_KINDS: LayoutKind[] = ['desktop', 'mobile']
const DATA_FILE = 'monhub.json'
const DRAWINGS_DIR = 'dessins/'
const WALLPAPER_DIR = 'fond-ecran/'

type Row = Record<string, unknown> & { id: string }

export interface BackupData {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  settings: Settings | null
  layouts: Partial<Record<LayoutKind, Layout>>
  tables: Partial<Record<AppTable, Row[]>>
}

export interface ParsedBackup {
  data: BackupData
  /** Fichiers des dessins, par nom (« <id>-v3.png »…). */
  drawingFiles: Record<string, Uint8Array>
  wallpaper: { name: string; bytes: Uint8Array } | null
}

const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', json: 'application/json' }

function mimeOf(name: string): string {
  return MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}

/** Assemble le fichier ZIP (fonction pure, testée). */
export function buildBackupZip(data: BackupData, drawingFiles: Record<string, Uint8Array>, wallpaper: ParsedBackup['wallpaper']): Uint8Array {
  const files: Zippable = { [DATA_FILE]: strToU8(JSON.stringify(data, null, 2)) }
  // Images déjà compressées : stockées telles quelles.
  for (const [name, bytes] of Object.entries(drawingFiles)) files[DRAWINGS_DIR + name] = name.endsWith('.json') ? bytes : [bytes, { level: 0 }]
  if (wallpaper) files[WALLPAPER_DIR + wallpaper.name] = [wallpaper.bytes, { level: 0 }]
  return zipSync(files)
}

/** Lit et vérifie un fichier de sauvegarde (fonction pure, testée). */
export function parseBackupZip(zip: Uint8Array): ParsedBackup {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(zip)
  } catch {
    throw new Error('Ce fichier n’est pas une archive ZIP valide.')
  }
  if (!files[DATA_FILE]) throw new Error('Ce fichier n’est pas une sauvegarde MonHub.')
  let raw: Partial<BackupData>
  try {
    raw = JSON.parse(strFromU8(files[DATA_FILE])) as Partial<BackupData>
  } catch {
    throw new Error('Sauvegarde illisible (monhub.json endommagé).')
  }
  if (raw.format !== BACKUP_FORMAT) throw new Error('Ce fichier n’est pas une sauvegarde MonHub.')
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) throw new Error('Sauvegarde créée par une version plus récente de MonHub.')

  const tables: BackupData['tables'] = {}
  for (const table of BACKUP_TABLES) {
    const rows = raw.tables?.[table]
    if (Array.isArray(rows)) tables[table] = rows.filter((row): row is Row => Boolean(row) && typeof row === 'object' && typeof row.id === 'string')
  }
  const layouts: BackupData['layouts'] = {}
  for (const kind of LAYOUT_KINDS) {
    const layout = raw.layouts?.[kind]
    if (layout && Array.isArray(layout.items)) layouts[kind] = layout
  }

  const drawingFiles: Record<string, Uint8Array> = {}
  let wallpaper: ParsedBackup['wallpaper'] = null
  for (const [path, bytes] of Object.entries(files)) {
    const name = path.split('/').pop() ?? ''
    // Noms simples uniquement (pas de « ../ » ni de sous-dossier).
    if (!name || !/^[\w.-]+$/.test(name)) continue
    if (path === DRAWINGS_DIR + name) drawingFiles[name] = bytes
    else if (path === WALLPAPER_DIR + name) wallpaper = { name, bytes }
  }

  return {
    data: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      settings: raw.settings && typeof raw.settings === 'object' ? raw.settings : null,
      layouts,
      tables,
    },
    drawingFiles,
    wallpaper,
  }
}

/** Nombre total de lignes d'une sauvegarde. */
export function countRows(data: BackupData): number {
  return Object.values(data.tables).reduce((total, rows) => total + (rows?.length ?? 0), 0)
}

/** Sous-tâches après leur tâche parente. */
export function parentsFirst(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => Number(Boolean(a.parent_id)) - Number(Boolean(b.parent_id)))
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

/** Rassemble toutes les données (réseau nécessaire) et renvoie le fichier ZIP. */
export async function createBackup(onProgress: (step: string) => void = () => {}): Promise<Blob> {
  onProgress('Réglages…')
  const settings = await backend.loadSettings()
  const layouts: BackupData['layouts'] = {}
  for (const kind of LAYOUT_KINDS) {
    const layout = await backend.loadLayout(kind)
    if (layout) layouts[kind] = layout
  }

  const tables: BackupData['tables'] = {}
  for (const table of BACKUP_TABLES) {
    onProgress(`Données : ${TABLE_LABELS[table]}…`)
    tables[table] = await backend.listRows<Row>(table)
  }

  const drawingFiles: Record<string, Uint8Array> = {}
  const drawings = (tables.drawings ?? []) as unknown as Drawing[]
  for (const [index, drawing] of drawings.entries()) {
    if (!drawing.version) continue
    onProgress(`Dessins (${index + 1}/${drawings.length})…`)
    for (const name of Object.values(fileNames(drawing))) {
      try {
        drawingFiles[name] = await bytesOf(await backend.downloadFile('drawings', name))
      } catch {
        // Fichier manquant (miniature d'un ancien dessin…) : la sauvegarde continue.
      }
    }
  }

  let wallpaper: ParsedBackup['wallpaper'] = null
  const background = settings?.preferences.wallpaper
  if (background?.type === 'image') {
    onProgress('Fond d’écran…')
    try {
      const blob = await (await fetch(await backend.wallpaperUrl(background.path))).blob()
      const extension = Object.entries(MIME).find(([, type]) => type === blob.type)?.[0] ?? 'png'
      wallpaper = { name: `fond.${extension}`, bytes: await bytesOf(blob) }
    } catch {
      // Fond d'écran introuvable : sauvegardé sans.
    }
  }

  const data: BackupData = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), settings, layouts, tables }
  return new Blob([buildBackupZip(data, drawingFiles, wallpaper) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

/**
 * Restaure une sauvegarde : les éléments de la sauvegarde sont ajoutés, ou remplacent leur version
 * actuelle (même identifiant). Rien n'est supprimé. Renvoie le fuseau horaire restauré.
 */
export async function restoreBackup(backup: ParsedBackup, onProgress: (step: string) => void = () => {}): Promise<string> {
  const { data } = backup
  const names = Object.keys(backup.drawingFiles)
  for (const [index, name] of names.entries()) {
    onProgress(`Dessins (${index + 1}/${names.length})…`)
    await backend.uploadFile('drawings', name, new Blob([backup.drawingFiles[name] as Uint8Array<ArrayBuffer>], { type: mimeOf(name) }))
  }

  for (const table of BACKUP_TABLES) {
    const rows = data.tables[table]
    if (!rows?.length) continue
    onProgress(`Données : ${TABLE_LABELS[table]}…`)
    const ordered = table === 'tasks' ? parentsFirst(rows) : rows
    for (let start = 0; start < ordered.length; start += 200) await backend.upsertRows(table, ordered.slice(start, start + 200))
  }

  const timeZone = data.settings?.timeZone ?? 'Europe/Paris'
  if (data.settings) {
    onProgress('Réglages…')
    const preferences = { ...data.settings.preferences }
    if (preferences.wallpaper?.type === 'image') {
      preferences.wallpaper = backup.wallpaper
        ? { type: 'image', path: await backend.uploadWallpaper(new Blob([backup.wallpaper.bytes as Uint8Array<ArrayBuffer>], { type: mimeOf(backup.wallpaper.name) })) }
        : { type: 'default' }
    }
    await backend.saveSettings({ theme: data.settings.theme, timeZone, preferences })
  }
  for (const kind of LAYOUT_KINDS) {
    const layout = data.layouts[kind]
    if (layout) await backend.saveLayout(kind, layout)
  }
  return timeZone
}
