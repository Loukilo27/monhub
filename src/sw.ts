import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] }

// Interface disponible hors-ligne : tous les fichiers du build sont mis en cache.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Mise à jour déclenchée par le bouton « Recharger » de l'app.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ---------- Notifications push ----------

/** Contenu envoyé par l'Edge Function dispatch-reminders. */
interface PushPayload {
  title: string
  body?: string
  url?: string
  kind?: string
  tag?: string
  notificationId?: string
  reminderId?: string
  token?: string
  actionUrl?: string
  actions?: { action: string; title: string }[]
  requireInteraction?: boolean
}

/** Adresse de l'app pour un chemin interne (#/app/clock…), en marquant la notification comme lue. */
function appUrl(payload: PushPayload): string {
  const path = payload.url || '/'
  const separator = path.includes('?') ? '&' : '?'
  const query = payload.notificationId ? `${separator}notif=${payload.notificationId}` : ''
  return `${self.registration.scope}#${path}${query}`
}

self.addEventListener('push', (event) => {
  let payload: PushPayload
  try {
    payload = event.data?.json() ?? { title: 'MonHub' }
  } catch {
    payload = { title: 'MonHub', body: event.data?.text() }
  }

  const options: NotificationOptions & { actions?: unknown; renotify?: boolean; vibrate?: number[] } = {
    body: payload.body,
    icon: `${self.registration.scope}pwa-192x192.png`,
    badge: `${self.registration.scope}badge-96x96.png`,
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    requireInteraction: payload.requireInteraction,
    vibrate: payload.kind === 'alarm' || payload.kind === 'timer' ? [400, 200, 400, 200, 400] : [120],
    data: payload,
    actions: payload.actions,
    lang: 'fr',
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const payload = (notification.data ?? {}) as PushPayload
  notification.close()

  // Bouton d'action : exécuté sans ouvrir l'app.
  if (event.action && payload.actionUrl && payload.reminderId && payload.token) {
    event.waitUntil(
      fetch(payload.actionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: payload.reminderId, token: payload.token, action: event.action }),
      }).catch(() => undefined),
    )
    return
  }

  // Clic sur la notification : ouvre (ou ramène au premier plan) l'app sur l'élément concerné.
  const url = appUrl(payload)
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = clients.find((candidate) => candidate.url.startsWith(self.registration.scope))
      if (client) {
        await client.focus()
        await client.navigate(url).catch(() => client.postMessage({ type: 'navigate', url }))
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
