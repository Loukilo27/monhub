import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { backend } from '../../data'
import { FunctionError } from '../../data/backend'
import type { MusicPeriod, RecentData, TopData } from './types'

const retry = (count: number, error: unknown) => !(error instanceof FunctionError && ['no_user', 'user_not_found', 'invalid_key'].includes(error.code)) && count < 2

/** Titre en cours et dernières écoutes (rafraîchi toutes les 30 s quand la page est visible). */
export function useRecent() {
  return useQuery({
    queryKey: ['music', 'recent'],
    queryFn: () => backend.callFunction<RecentData>('lastfm', { action: 'recent' }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    retry,
  })
}

export function useTop(period: MusicPeriod) {
  return useQuery({
    queryKey: ['music', 'top', period],
    queryFn: () => backend.callFunction<TopData>('lastfm', { action: 'top', period }),
    staleTime: period === 'month' || period === 'year' ? 10 * 60_000 : 24 * 3600_000,
    retry,
  })
}

/** Force le recalcul côté serveur (ignore le cache). */
export function useRefreshTop() {
  const queryClient = useQueryClient()
  return useCallback(
    async (period: MusicPeriod) => {
      const fresh = await backend.callFunction<TopData>('lastfm', { action: 'top', period, refresh: true })
      queryClient.setQueryData(['music', 'top', period], fresh)
    },
    [queryClient],
  )
}

export function errorMessage(error: unknown): string {
  return error instanceof FunctionError ? error.message : 'Impossible de joindre Last.fm pour le moment.'
}
