import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { isDemoMode } from '../data'
import { refreshPushSubscription } from './push'
import { useMarkRead, useNotificationsRealtime } from './queries'

/**
 * Branchements globaux des notifications (dans la racine des pages connectées) :
 * - temps réel (cloche + toasts) ;
 * - clic sur une notification système : l'URL porte ?notif=<id>, marquée comme lue puis retirée ;
 * - renouvellement silencieux de l'abonnement push de l'appareil.
 */
export function useNotificationLinks() {
  useNotificationsRealtime()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { mutate: markRead } = useMarkRead()
  const notificationId = params.get('notif')

  useEffect(() => {
    if (!notificationId) return
    markRead([notificationId])
    const next = new URLSearchParams(params)
    next.delete('notif')
    setParams(next, { replace: true })
  }, [notificationId, params, setParams, markRead])

  useEffect(() => {
    if (!isDemoMode) void refreshPushSubscription().catch(() => undefined)
    // Le service worker demande parfois à l'app de naviguer (quand client.navigate est refusé).
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'navigate' || typeof event.data.url !== 'string') return
      const hash = new URL(event.data.url).hash.replace(/^#/, '')
      navigate(hash || '/')
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage)
  }, [navigate])
}
