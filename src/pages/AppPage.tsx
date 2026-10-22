import { Suspense, useEffect } from 'react'
import { useParams } from 'react-router'
import { getApp } from '../apps/registry'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import NotFoundPage from './NotFoundPage'

/** Page plein écran d'une mini-appli : #/app/<id>. */
export default function AppPage() {
  const { appId } = useParams()
  const app = getApp(appId)

  useEffect(() => {
    document.title = app ? `${app.name} · MonHub` : 'MonHub'
    return () => {
      document.title = 'MonHub'
    }
  }, [app])

  if (!app) return <NotFoundPage />

  const Icon = app.icon
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={app.name}
        icon={
          <span
            className="grid size-8 place-items-center rounded-lg text-white"
            // Même nom que l'icône cliquée sur l'accueil : l'icône « s'envole » vers l'en-tête.
            style={{ background: app.color, viewTransitionName: `app-icon-${app.id}` }}
          >
            <Icon aria-hidden className="size-4" />
          </span>
        }
      />
      <main className="flex-1">
        <Suspense fallback={<Spinner />}>
          <app.Page />
        </Suspense>
      </main>
    </div>
  )
}
