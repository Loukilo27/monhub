import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useToast } from '../components/toast'
import type { AppTable } from './backend'
import { backend } from './index'

/**
 * Hooks génériques pour les tables des mini-applis : lecture, enregistrement et suppression
 * avec mise à jour optimiste, et synchronisation temps réel entre appareils.
 */

export const rowsKey = (table: AppTable) => ['rows', table] as const

export function useRows<T extends { id: string }>(table: AppTable) {
  return useQuery({ queryKey: rowsKey(table), queryFn: () => backend.listRows<T>(table) })
}

export function useSaveRows<T extends { id: string }>(table: AppTable) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationKey: ['rows', table],
    mutationFn: (rows: T[]) => backend.upsertRows(table, rows),
    onMutate: async (rows) => {
      await queryClient.cancelQueries({ queryKey: rowsKey(table) })
      const previous = queryClient.getQueryData<T[]>(rowsKey(table))
      queryClient.setQueryData<T[]>(rowsKey(table), (current = []) => {
        const byId = new Map(current.map((row) => [row.id, row]))
        for (const row of rows) byId.set(row.id, { ...byId.get(row.id), ...row })
        return [...byId.values()]
      })
      return { previous }
    },
    onError: (_error, _rows, context) => {
      queryClient.setQueryData(rowsKey(table), context?.previous)
      toast('Modification non enregistrée. Vérifie ta connexion.', 'error')
    },
  })
}

export function useDeleteRows(table: AppTable) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationKey: ['rows', table],
    mutationFn: (ids: string[]) => backend.deleteRows(table, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: rowsKey(table) })
      const previous = queryClient.getQueryData<{ id: string }[]>(rowsKey(table))
      queryClient.setQueryData<{ id: string }[]>(rowsKey(table), (current = []) => current.filter((row) => !ids.includes(row.id)))
      return { previous }
    },
    onError: (_error, _ids, context) => {
      queryClient.setQueryData(rowsKey(table), context?.previous)
      toast('Suppression non enregistrée. Vérifie ta connexion.', 'error')
    },
  })
}

/** Recharge une table quand elle change sur un autre appareil (hors de nos propres envois). */
export function useRowsRealtime(tables: AppTable[]) {
  const queryClient = useQueryClient()
  const key = tables.join(',')
  useEffect(() => {
    const stops = key.split(',').map((table) =>
      backend.subscribe(table as AppTable, () => {
        if (queryClient.isMutating({ mutationKey: ['rows', table] })) return
        void queryClient.invalidateQueries({ queryKey: rowsKey(table as AppTable) })
      }),
    )
    return () => stops.forEach((stop) => stop())
  }, [key, queryClient])
}
