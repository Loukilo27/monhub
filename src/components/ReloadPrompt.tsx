import { useRegisterSW } from 'virtual:pwa-register/react'

/** Bandeau proposant de recharger quand une nouvelle version a été déployée. */
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Vérifie une mise à jour toutes les heures (l'app reste ouverte longtemps).
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh && !offlineReady) return null

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft"
    >
      <span className="flex-1">
        {needRefresh ? 'Une nouvelle version de MonHub est disponible.' : 'MonHub fonctionne maintenant hors-ligne.'}
      </span>
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-11 rounded-xl bg-accent px-4 font-medium text-accent-contrast"
        >
          Recharger
        </button>
      )}
      <button type="button" onClick={close} className="min-h-11 rounded-xl px-3 text-muted hover:bg-surface-2">
        Fermer
      </button>
    </div>
  )
}
