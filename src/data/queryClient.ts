import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'

const WEEK = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Gardé une semaine pour l'affichage instantané au démarrage (cache persistant).
      gcTime: WEEK,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})

/** Cache des requêtes conservé dans le navigateur : l'accueil s'affiche sans attendre le réseau. */
export const queryPersister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'monhub.cache',
  throttleTime: 1000,
})

export const persistOptions = {
  persister: queryPersister,
  maxAge: WEEK,
  // À incrémenter si la forme des données en cache change.
  buster: 'v1',
}

/** Efface toutes les données en cache (déconnexion). */
export async function clearCachedData() {
  queryClient.clear()
  await queryPersister.removeClient()
}
