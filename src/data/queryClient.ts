import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { setSoundPreferences } from '../apps/clock/sounds'
import { hourCycle, setDisplayTimeZone, setHourCycle } from '../lib/time'
import type { Settings } from './backend'
import { outbox } from './index'

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
    mutations: {
      // Les écritures partent même hors-ligne : la file d'attente (outbox.ts) les garde jusqu'au retour du réseau.
      networkMode: 'always',
    },
  },
})

/**
 * Format d'heure, fuseau horaire et sons appliqués dès que les réglages changent dans le cache
 * (chargement, modification ici ou sur un autre appareil), avant que les pages ne s'affichent.
 */
queryClient.getQueryCache().subscribe((event) => {
  if (event.query.queryKey[0] !== 'settings') return
  const settings = event.query.state.data as Settings | null | undefined
  if (!settings) return
  const timeFormat = settings.preferences.timeFormat ?? 'h23'
  if (timeFormat !== hourCycle()) setHourCycle(timeFormat)
  setDisplayTimeZone(settings.timeZone)
  setSoundPreferences(settings.preferences.sounds ?? {})
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

/** Efface toutes les données en cache et les modifications en attente (déconnexion). */
export async function clearCachedData() {
  outbox.clear()
  queryClient.clear()
  await queryPersister.removeClient()
}
