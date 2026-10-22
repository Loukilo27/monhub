import { Maximize2, X } from 'lucide-react'
import { Component, Suspense, useContext, type ReactNode } from 'react'
import { Link, useNavigate, useViewTransitionState } from 'react-router'
import { getApp, getWidget } from '../apps/registry'
import type { MiniApp } from '../apps/types'
import type { GridItem } from './types'
import { WidgetConfigContext } from './widgetConfig'

/** Icône d'appli de l'accueil (raccourci). */
export function ShortcutTile({ app, compact }: { app: MiniApp; compact: boolean }) {
  const Icon = app.icon
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden p-1">
      <span
        className="grid aspect-square w-[min(3.5rem,62%)] place-items-center rounded-[28%] text-white shadow-soft"
        style={{ background: `linear-gradient(145deg, ${app.color}, color-mix(in oklab, ${app.color} 70%, black))` }}
      >
        <Icon aria-hidden className="size-1/2" strokeWidth={2} />
      </span>
      {!compact && <span className="home-label max-w-full truncate px-1 text-xs font-medium">{app.name}</span>}
    </span>
  )
}

class WidgetErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return <div className="grid h-full place-items-center p-2 text-center text-xs text-muted">Widget indisponible</div>
    }
    return this.props.children
  }
}

/** Contenu d'un élément de la grille (raccourci ou widget), sans interaction. */
export function GridItemContent({ item, compact }: { item: GridItem; compact: boolean }) {
  const saveConfig = useContext(WidgetConfigContext)
  const app = getApp(item.appId)
  if (!app) return null
  if (item.type === 'shortcut') return <ShortcutTile app={app} compact={compact} />

  const widget = getWidget(item.appId, item.widgetId)
  return (
    <div
      className="h-full w-full overflow-hidden rounded-3xl border border-border/60 bg-surface/85 text-text shadow-soft backdrop-blur-md"
      // Les widgets dimensionnent leur texte en unités cqw / cqh (taille du widget).
      style={{ containerType: 'size' }}
    >
      <WidgetErrorBoundary>
        <Suspense fallback={null}>
          {widget ? (
            <widget.Component
              size={{ w: item.w, h: item.h }}
              config={item.config}
              onConfigChange={saveConfig ? (config) => saveConfig(item.id, config) : undefined}
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted">Widget introuvable</div>
          )}
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}

/** Élément en mode normal : un lien vers la mini-appli. */
export function GridItemLink({ item, compact, onClickCapture }: {
  item: GridItem
  compact: boolean
  onClickCapture: (event: React.MouseEvent) => void
}) {
  const app = getApp(item.appId)
  const to = `/app/${item.appId}`
  const transitioning = useViewTransitionState(to)
  const navigate = useNavigate()
  if (!app) return null

  if (item.type === 'widget') {
    // Un widget peut contenir ses propres boutons (ex. cocher une tâche) : ce n'est donc pas un lien.
    // Un clic ailleurs dans le widget ouvre la mini-appli ; au clavier, un lien dédié apparaît au focus.
    const name = getWidget(item.appId, item.widgetId)?.name ?? ''
    return (
      <div
        role="group"
        aria-label={`Widget ${name}`}
        onClickCapture={onClickCapture}
        onClick={(event) => {
          if (event.defaultPrevented || (event.target as HTMLElement).closest('button, a, input, [data-widget-action]')) return
          navigate(to, { viewTransition: true })
        }}
        className="relative h-full w-full cursor-pointer rounded-3xl"
      >
        <GridItemContent item={item} compact={compact} />
        <Link
          to={to}
          viewTransition
          className="sr-only rounded-full bg-accent px-3 py-1 text-sm text-accent-contrast focus:not-sr-only focus:absolute focus:right-2 focus:bottom-2"
        >
          Ouvrir {app.name}
        </Link>
      </div>
    )
  }

  const label = app.name
  return (
    <Link
      to={to}
      viewTransition
      aria-label={label}
      onClickCapture={onClickCapture}
      draggable={false}
      className="block h-full w-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ viewTransitionName: transitioning && item.type === 'shortcut' ? `app-icon-${app.id}` : undefined }}
    >
      <GridItemContent item={item} compact={compact} />
    </Link>
  )
}

/** Badges du mode édition : supprimer, et redimensionner pour les widgets. */
export function EditBadges({ item, onRemove, onResize }: { item: GridItem; onRemove: () => void; onResize?: () => void }) {
  const name = getApp(item.appId)?.name ?? ''
  const stop = (event: React.PointerEvent) => event.stopPropagation()
  return (
    <>
      <button
        type="button"
        aria-label={`Retirer ${name} de l’accueil`}
        onPointerDown={stop}
        onClick={onRemove}
        className="absolute top-0 left-0 z-10 grid size-7 place-items-center rounded-full border border-border bg-surface text-text shadow-soft hover:bg-danger hover:text-white"
      >
        <X aria-hidden className="size-4" />
      </button>
      {onResize && (
        <button
          type="button"
          aria-label={`Changer la taille du widget ${name}`}
          onPointerDown={stop}
          onClick={onResize}
          className="absolute top-0 right-0 z-10 grid size-7 place-items-center rounded-full border border-border bg-surface text-text shadow-soft hover:bg-accent hover:text-accent-contrast"
        >
          <Maximize2 aria-hidden className="size-3.5" />
        </button>
      )}
    </>
  )
}
