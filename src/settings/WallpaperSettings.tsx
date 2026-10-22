import { Check, ImageUp, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { useToast } from '../components/toast'
import type { Wallpaper } from '../data/backend'
import { backend } from '../data'
import { useSettings, useUpdatePreferences, useWallpaperUrl } from '../data/queries'
import { prepareWallpaperImage, WALLPAPER_COLORS, WALLPAPER_GRADIENTS, wallpaperBackground } from './wallpapers'

function Swatch({ label, background, selected, onClick }: {
  label: string
  background: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className="relative grid aspect-[3/4] place-items-center rounded-xl border border-border shadow-soft transition-transform hover:scale-[1.03] aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
      style={{ background }}
    >
      {selected && <Check aria-hidden className="size-5 rounded-full bg-black/50 p-0.5 text-white" />}
    </button>
  )
}

/** Choix du fond d'écran de l'accueil : par défaut, dégradé, couleur unie ou image importée. */
export function WallpaperSettings() {
  const current = useSettings().data?.preferences.wallpaper ?? { type: 'default' }
  const imageUrl = useWallpaperUrl(current).data
  const updatePreferences = useUpdatePreferences()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const select = (wallpaper: Wallpaper) => {
    // L'ancienne image importée est supprimée du stockage quand on en change.
    if (current.type === 'image' && !(wallpaper.type === 'image' && wallpaper.path === current.path)) {
      void backend.deleteWallpaper(current.path)
    }
    updatePreferences({ wallpaper })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const path = await backend.uploadWallpaper(await prepareWallpaperImage(file))
      select({ type: 'image', path })
      toast('Fond d’écran mis à jour.', 'success')
    } catch {
      toast('Impossible d’importer cette image.', 'error')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const isSelected = (wallpaper: Wallpaper) => JSON.stringify(wallpaper) === JSON.stringify(current)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
        <Swatch
          label="Par défaut (suit le thème)"
          background="var(--wallpaper)"
          selected={current.type === 'default'}
          onClick={() => select({ type: 'default' })}
        />
        {WALLPAPER_GRADIENTS.map((gradient) => (
          <Swatch
            key={gradient.id}
            label={`Dégradé ${gradient.label}`}
            background={gradient.css}
            selected={isSelected({ type: 'gradient', value: gradient.id })}
            onClick={() => select({ type: 'gradient', value: gradient.id })}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {WALLPAPER_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Couleur ${color}`}
            aria-pressed={isSelected({ type: 'color', value: color })}
            onClick={() => select({ type: 'color', value: color })}
            className="size-11 rounded-full border border-border shadow-soft aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
            style={{ background: color }}
          />
        ))}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm font-medium hover:bg-surface-2">
          <input
            type="color"
            value={current.type === 'color' ? current.value : '#3563e9'}
            onChange={(event) => select({ type: 'color', value: event.target.value })}
            className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
          Autre couleur
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
        >
          {uploading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ImageUp aria-hidden className="size-4" />}
          Importer une image
        </button>
        {current.type === 'image' && (
          <span
            role="img"
            aria-label="Image actuelle"
            className="h-14 w-10 rounded-lg border border-border bg-surface-2"
            style={{ background: wallpaperBackground(current, imageUrl) }}
          />
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
      </div>
    </div>
  )
}
