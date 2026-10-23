import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { useToast } from '../components/toast'
import { outbox } from './index'

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}

/** Nombre de modifications faites hors-ligne et pas encore envoyées. */
export function usePendingChanges(): number {
  return useSyncExternalStore(
    (callback) => outbox.subscribe(callback),
    () => outbox.size,
  )
}

/**
 * Après l'envoi des modifications faites hors-ligne : recharge les données depuis le serveur
 * (qui a pu recevoir entre-temps des modifications d'un autre appareil) et signale les refus.
 */
export function useOutboxSync() {
  const queryClient = useQueryClient()
  const toast = useToast()
  useEffect(
    () =>
      outbox.onFlushed(({ sent, failed }) => {
        void queryClient.invalidateQueries()
        if (failed === 1) toast('Une modification faite hors-ligne n’a pas pu être enregistrée.', 'error')
        else if (failed) toast(`${failed} modifications faites hors-ligne n’ont pas pu être enregistrées.`, 'error')
        else if (sent) toast('Modifications hors-ligne synchronisées.', 'success')
      }),
    [queryClient, toast],
  )
}
