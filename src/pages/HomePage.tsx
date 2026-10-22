import { LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { AppDrawer } from '../components/AppDrawer'
import { StatusBar } from '../components/StatusBar'

/**
 * Accueil. La grille personnalisable (10×6 sur PC, 4×6 multipages sur mobile)
 * arrive à la phase 3 ; d'ici là l'accueil est vide avec un accès au tiroir.
 */
export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col" style={{ background: 'var(--wallpaper)' }}>
      <StatusBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <p className="text-muted">Votre écran d'accueil est vide.</p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 font-medium shadow-soft transition-colors hover:bg-surface-2"
        >
          <LayoutGrid aria-hidden className="size-5" />
          Toutes les applications
        </button>
      </main>
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
