import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MiniApp, WidgetDefinition, WidgetSize } from '../apps/types'
import { AppDrawer } from '../components/AppDrawer'
import { StatusBar } from '../components/StatusBar'
import { useToast } from '../components/toast'
import { useLayout, useSaveLayout, useSettings, useWallpaperUrl } from '../data/queries'
import { EditBar } from '../home/EditBar'
import { HomeGrid } from '../home/HomeGrid'
import { addItem, compactPages } from '../home/layoutEngine'
import { EMPTY_LAYOUT, GRID_SPECS, type GridItem, type Layout } from '../home/types'
import { useLayoutKind } from '../home/useLayoutKind'
import { isDarkWallpaper, wallpaperBackground } from '../settings/wallpapers'

/** Accueil : grille personnalisable (10×6 sur PC, 4×6 multipages sur mobile). */
export default function HomePage() {
  const kind = useLayoutKind()
  const spec = GRID_SPECS[kind]
  const layoutQuery = useLayout(kind)
  const saveLayout = useSaveLayout(kind)
  const layout = layoutQuery.data ?? EMPTY_LAYOUT
  const toast = useToast()

  const wallpaper = useSettings().data?.preferences.wallpaper
  const wallpaperUrl = useWallpaperUrl(wallpaper).data
  const dark = isDarkWallpaper(wallpaper)

  const [editing, setEditing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(0)

  const save = (next: Layout) => saveLayout.mutate(next)

  const finishEditing = () => {
    setEditing(false)
    if (kind === 'mobile') {
      const compacted = compactPages(layout)
      if (JSON.stringify(compacted) !== JSON.stringify(layout)) save(compacted)
    }
  }

  // Échap quitte le mode édition (sur l'accueil, il ne sert à rien d'autre).
  useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) finishEditing()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const add = (item: Omit<GridItem, 'page' | 'x' | 'y'>, label: string) => {
    const next = addItem(layout, spec, item, page)
    if (!next) {
      toast('Plus de place sur l’accueil pour cet élément.', 'error')
      return
    }
    save(next)
    setDrawerOpen(false)
    toast(`${label} ajouté à l’accueil.`, 'success')
  }

  const addShortcut = (app: MiniApp) =>
    add({ id: crypto.randomUUID(), type: 'shortcut', appId: app.id, w: 1, h: 1 }, app.name)

  const addWidget = (app: MiniApp, widget: WidgetDefinition, size: WidgetSize) =>
    add({ id: crypto.randomUUID(), type: 'widget', appId: app.id, widgetId: widget.id, ...size }, `Widget ${widget.name}`)

  const empty = layoutQuery.isSuccess && layout.items.length === 0

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${dark === true ? 'home-dark' : dark === false ? 'home-light' : ''}`}
      style={{ background: wallpaperBackground(wallpaper, wallpaperUrl) }}
    >
      <StatusBar
        editAction={
          !editing && kind === 'desktop' ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-surface-2/60"
            >
              <Pencil aria-hidden className="size-4" />
              Modifier
            </button>
          ) : null
        }
      />
      <main className={`relative flex min-h-0 flex-1 flex-col px-2 ${kind === 'mobile' ? 'pb-10' : 'pb-4'} ${editing ? 'pb-24' : ''}`}>
        <HomeGrid
          kind={kind}
          layout={layout}
          editing={editing}
          onEditingChange={setEditing}
          onChange={save}
          onPageChange={setPage}
        />
        {empty && !editing && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="home-label text-base">Ton écran d’accueil est vide.</p>
            <p className="home-label text-sm opacity-80">
              {kind === 'mobile' ? 'Appui long n’importe où' : 'Clic droit ou bouton « Modifier »'} pour le personnaliser.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(true)
                setDrawerOpen(true)
              }}
              className="pointer-events-auto mt-2 min-h-11 rounded-full bg-surface px-5 font-medium text-text shadow-soft hover:bg-surface-2"
            >
              Ajouter des applis
            </button>
          </div>
        )}
      </main>
      {editing && <EditBar onAdd={() => setDrawerOpen(true)} onDone={finishEditing} />}
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddShortcut={editing ? addShortcut : undefined}
        onAddWidget={editing ? addWidget : undefined}
      />
    </div>
  )
}
