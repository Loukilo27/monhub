import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { sanitizeLayout } from '../home/layoutEngine'
import { GRID_SPECS, type Layout, type LayoutKind } from '../home/types'
import { useToast } from '../components/toast'
import type { Preferences, Settings, Wallpaper } from './backend'
import { backend } from './index'
import { rowToLayout, rowToSettings } from './supabaseBackend'

export const queryKeys = {
  settings: ['settings'] as const,
  layout: (kind: LayoutKind) => ['layout', kind] as const,
  wallpaperUrl: (path: string) => ['wallpaper-url', path] as const,
}

// ---------- Réglages ----------

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => backend.loadSettings() })
}

const DEFAULT_SETTINGS: Settings = { theme: 'system', timeZone: 'Europe/Paris', preferences: {} }

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationKey: ['settings'],
    mutationFn: (patch: Partial<Settings>) => backend.saveSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings })
      const previous = queryClient.getQueryData<Settings | null>(queryKeys.settings)
      queryClient.setQueryData<Settings>(queryKeys.settings, { ...DEFAULT_SETTINGS, ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      queryClient.setQueryData(queryKeys.settings, context?.previous)
      toast('Réglage non enregistré. Vérifie ta connexion.', 'error')
    },
  })
}

/** Met à jour une préférence en conservant les autres. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  const update = useUpdateSettings()
  return (patch: Partial<Preferences>) => {
    const current = queryClient.getQueryData<Settings | null>(queryKeys.settings)?.preferences ?? {}
    update.mutate({ preferences: { ...current, ...patch } })
  }
}

/** Fuseau horaire de l'utilisateur (réglages), Europe/Paris par défaut. */
export function useTimeZone(): string {
  return useSettings().data?.timeZone ?? 'Europe/Paris'
}

// ---------- Dispositions de l'accueil ----------

export function useLayout(kind: LayoutKind) {
  return useQuery({
    queryKey: queryKeys.layout(kind),
    queryFn: async () => sanitizeLayout(await backend.loadLayout(kind), GRID_SPECS[kind]),
  })
}

export function useSaveLayout(kind: LayoutKind) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationKey: ['layout', kind],
    mutationFn: (layout: Layout) => backend.saveLayout(kind, layout),
    onMutate: async (layout) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.layout(kind) })
      const previous = queryClient.getQueryData<Layout>(queryKeys.layout(kind))
      queryClient.setQueryData(queryKeys.layout(kind), layout)
      return { previous }
    },
    onError: (_error, _layout, context) => {
      queryClient.setQueryData(queryKeys.layout(kind), context?.previous)
      toast('Disposition non enregistrée. Vérifie ta connexion.', 'error')
    },
  })
}

// ---------- Fond d'écran ----------

/** URL affichable d'un fond d'écran importé (lien signé valable 7 jours, mis en cache 6 jours). */
export function useWallpaperUrl(wallpaper: Wallpaper | undefined) {
  const path = wallpaper?.type === 'image' ? wallpaper.path : ''
  return useQuery({
    queryKey: queryKeys.wallpaperUrl(path),
    queryFn: () => backend.wallpaperUrl(path),
    enabled: Boolean(path),
    staleTime: 6 * 24 * 60 * 60 * 1000,
  })
}

// ---------- Synchronisation temps réel ----------

/** Applique au cache les modifications faites sur un autre appareil. */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const stopSettings = backend.subscribe('settings', (row, event) => {
      if (event === 'DELETE' || queryClient.isMutating({ mutationKey: ['settings'] })) return
      queryClient.setQueryData(queryKeys.settings, rowToSettings(row))
    })
    const stopLayouts = backend.subscribe('layouts', (row, event) => {
      const kind = row.kind
      if (event === 'DELETE' || (kind !== 'desktop' && kind !== 'mobile')) return
      // Ignore l'écho de nos propres enregistrements en cours.
      if (queryClient.isMutating({ mutationKey: ['layout', kind] })) return
      queryClient.setQueryData(queryKeys.layout(kind), sanitizeLayout(rowToLayout(row), GRID_SPECS[kind]))
    })
    return () => {
      stopSettings()
      stopLayouts()
    }
  }, [queryClient])
}
