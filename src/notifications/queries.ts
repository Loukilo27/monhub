import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useToast } from '../components/toast'
import type { AppNotification, NewReminder, NotificationPreferences } from '../data/backend'
import { backend } from '../data'
import { queryKeys as baseKeys, useSettings, useUpdatePreferences } from '../data/queries'
import { rowToNotification } from '../data/supabaseBackend'
import { playAlarmChime } from './sound'

export const notificationKeys = {
  list: ['notifications'] as const,
  devices: ['push-devices'] as const,
}

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.list, queryFn: () => backend.listNotifications() })
}

export function useUnreadCount(): number {
  return useNotifications().data?.filter((notification) => !notification.readAt).length ?? 0
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[] | 'all') => backend.markNotificationsRead(ids),
    onMutate: (ids) => {
      const now = new Date().toISOString()
      queryClient.setQueryData<AppNotification[]>(notificationKeys.list, (list) =>
        list?.map((item) => (ids === 'all' || ids.includes(item.id) ? { ...item, readAt: item.readAt ?? now } : item)),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list }),
  })
}

export function useClearNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => backend.clearNotifications(),
    onMutate: () => queryClient.setQueryData(notificationKeys.list, []),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list }),
  })
}

export function usePushDevices() {
  return useQuery({ queryKey: notificationKeys.devices, queryFn: () => backend.listPushDevices() })
}

export function useDeletePushDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deletePushDevice(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.devices }),
  })
}

/** Programme un rappel et, s'il est déjà échu, demande son envoi immédiat. */
export function useCreateReminder() {
  return useMutation({
    mutationFn: async (reminder: NewReminder) => {
      await backend.createReminder(reminder)
      if (reminder.sendAt.getTime() <= Date.now()) await backend.dispatchNow()
    },
  })
}

export function useNotificationPreferences(): NotificationPreferences {
  return useSettings().data?.preferences.notifications ?? {}
}

export function useUpdateNotificationPreferences() {
  const prefs = useNotificationPreferences()
  const updatePreferences = useUpdatePreferences()
  return (patch: Partial<NotificationPreferences>) => updatePreferences({ notifications: { ...prefs, ...patch } })
}

/**
 * Nouvelles notifications en temps réel : ajoutées sous la cloche et, app ouverte,
 * affichées en toast (avec une sonnerie pour les alarmes et minuteurs).
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(
    () =>
      backend.subscribe('notifications', (row, event) => {
        if (event !== 'INSERT') {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.list })
          return
        }
        const notification = rowToNotification(row)
        queryClient.setQueryData<AppNotification[]>(notificationKeys.list, (list = []) =>
          list.some((item) => item.id === notification.id) ? list : [notification, ...list],
        )
        const settings = queryClient.getQueryData<{ preferences?: { notifications?: NotificationPreferences } }>(baseKeys.settings)
        if (settings?.preferences?.notifications?.disabledApps?.includes(notification.source)) return
        toast(notification.body ? `${notification.title} — ${notification.body}` : notification.title, 'info')
        if (notification.kind === 'alarm' || notification.kind === 'timer') playAlarmChime()
      }),
    [queryClient, toast],
  )
}
