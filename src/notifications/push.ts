import { VAPID_PUBLIC_KEY } from '../config'
import { backend } from '../data'

export type PushStatus = 'unsupported' | 'denied' | 'prompt' | 'enabled'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/** Nom lisible de l'appareil, ex. « Edge · Windows » ou « Chrome · Android ». */
export function deviceLabel(userAgent = navigator.userAgent): string {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /SamsungBrowser/.test(userAgent)
      ? 'Samsung Internet'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Navigateur'
  const system = /Android/.test(userAgent)
    ? 'Android'
    : /Windows/.test(userAgent)
      ? 'Windows'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Appareil'
  return `${browser} · ${system}`
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isPushSupported()) return undefined
  return navigator.serviceWorker.getRegistration()
}

export async function currentPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await (await registration())?.pushManager.getSubscription()
  return Notification.permission === 'granted' && subscription ? 'enabled' : 'prompt'
}

/** Endpoint de l'abonnement de cet appareil (pour le repérer dans la liste). */
export async function currentEndpoint(): Promise<string | null> {
  return (await (await registration())?.pushManager.getSubscription())?.endpoint ?? null
}

/** Demande l'autorisation puis abonne cet appareil aux notifications push. */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'prompt'
  const reg = await navigator.serviceWorker.ready
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }))
  await backend.savePushSubscription(subscription.toJSON(), deviceLabel())
  return 'enabled'
}

/** Désabonne cet appareil. */
export async function disablePush(): Promise<void> {
  const subscription = await (await registration())?.pushManager.getSubscription()
  await subscription?.unsubscribe()
}

/**
 * Au démarrage : si l'autorisation est accordée, s'assure que l'abonnement existe et qu'il est
 * enregistré (le navigateur peut le renouveler à tout moment).
 */
export async function refreshPushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }))
  await backend.savePushSubscription(subscription.toJSON(), deviceLabel())
}
