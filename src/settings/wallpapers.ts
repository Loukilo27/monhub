import type { Wallpaper } from '../data/backend'

export const WALLPAPER_GRADIENTS: { id: string; label: string; css: string }[] = [
  { id: 'aurore', label: 'Aurore', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'lagon', label: 'Lagon', css: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' },
  { id: 'peche', label: 'Pêche', css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'nuit', label: 'Nuit', css: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { id: 'couchant', label: 'Couchant', css: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)' },
  { id: 'foret', label: 'Forêt', css: 'linear-gradient(160deg, #134e5e 0%, #71b280 100%)' },
  { id: 'lavande', label: 'Lavande', css: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  { id: 'ardoise', label: 'Ardoise', css: 'linear-gradient(160deg, #232526 0%, #414345 100%)' },
]

export const WALLPAPER_COLORS = ['#1e293b', '#0f766e', '#7c3aed', '#be123c', '#c2410c', '#f1f5f9', '#fef3c7', '#dbeafe']

/** Arrière-plan CSS d'un fond d'écran (l'image est résolue à part, via une URL signée). */
export function wallpaperBackground(wallpaper: Wallpaper | undefined, imageUrl?: string): string {
  switch (wallpaper?.type) {
    case 'color':
      return wallpaper.value
    case 'gradient':
      return WALLPAPER_GRADIENTS.find((gradient) => gradient.id === wallpaper.value)?.css ?? 'var(--wallpaper)'
    case 'image':
      return imageUrl ? `center / cover no-repeat url("${imageUrl}"), var(--bg)` : 'var(--wallpaper)'
    default:
      return 'var(--wallpaper)'
  }
}

/** Faux pour les fonds clairs, où le texte blanc ne serait pas lisible. */
export function isDarkWallpaper(wallpaper: Wallpaper | undefined): boolean | undefined {
  if (wallpaper?.type === 'image') return true
  const hex =
    wallpaper?.type === 'color'
      ? wallpaper.value
      : wallpaper?.type === 'gradient'
        ? WALLPAPER_GRADIENTS.find((gradient) => gradient.id === wallpaper.value)?.css.match(/#[0-9a-f]{6}/i)?.[0]
        : undefined
  if (!hex) return undefined
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b < 150
}

/** Réduit une image importée (2560 px max, WebP) avant envoi, pour économiser le stockage gratuit. */
export async function prepareWallpaperImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image illisible'))), 'image/webp', 0.85),
  )
}
