import type { Layout, LayoutKind } from '../home/types'
import { requireSupabase } from '../lib/supabase'
import { isThemePreference } from '../theme/theme'
import type { AppNotification, AppTable, Backend, Preferences, Settings } from './backend'

async function userId(): Promise<string> {
  const { data } = await requireSupabase().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Session expirée : reconnecte-toi.')
  return id
}

function check<T extends { error: { message: string } | null }>(result: T): T {
  if (result.error) throw new Error(result.error.message)
  return result
}

export function rowToSettings(row: Record<string, unknown>): Settings {
  return {
    theme: isThemePreference(row.theme) ? row.theme : 'system',
    timeZone: typeof row.time_zone === 'string' ? row.time_zone : 'Europe/Paris',
    preferences: (row.preferences && typeof row.preferences === 'object' ? row.preferences : {}) as Preferences,
  }
}

export function rowToLayout(row: Record<string, unknown>): Layout {
  return {
    items: Array.isArray(row.items) ? row.items : [],
    pageCount: typeof row.page_count === 'number' ? row.page_count : 1,
  }
}

export function rowToNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    source: String(row.source ?? 'system'),
    kind: String(row.kind ?? 'info'),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    url: String(row.url ?? '/'),
    refId: (row.ref_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const supabaseBackend: Backend = {
  async loadSettings() {
    const { data } = check(await requireSupabase().from('settings').select('theme, time_zone, preferences').maybeSingle())
    return data ? rowToSettings(data) : null
  },

  async saveSettings(patch) {
    const row: Record<string, unknown> = { user_id: await userId() }
    if (patch.theme) row.theme = patch.theme
    if (patch.timeZone) row.time_zone = patch.timeZone
    if (patch.preferences) row.preferences = patch.preferences
    // upsert ne met à jour que les colonnes envoyées.
    check(await requireSupabase().from('settings').upsert(row))
  },

  async loadLayout(kind) {
    const { data } = check(
      await requireSupabase().from('layouts').select('items, page_count').eq('kind', kind).maybeSingle(),
    )
    return data ? rowToLayout(data) : null
  },

  async saveLayout(kind: LayoutKind, layout: Layout) {
    check(
      await requireSupabase()
        .from('layouts')
        .upsert({ user_id: await userId(), kind, items: layout.items, page_count: layout.pageCount }),
    )
  },

  async uploadWallpaper(image) {
    const extension = image.type === 'image/png' ? 'png' : image.type === 'image/jpeg' ? 'jpg' : 'webp'
    const path = `${await userId()}/fond-${Date.now()}.${extension}`
    check(await requireSupabase().storage.from('wallpapers').upload(path, image, { contentType: image.type }))
    return path
  },

  async deleteWallpaper(path) {
    await requireSupabase().storage.from('wallpapers').remove([path])
  },

  async wallpaperUrl(path) {
    const { data } = check(await requireSupabase().storage.from('wallpapers').createSignedUrl(path, 60 * 60 * 24 * 7))
    if (!data) throw new Error('Fond d’écran introuvable.')
    return data.signedUrl
  },

  async listNotifications() {
    const { data } = check(
      await requireSupabase()
        .from('notifications')
        .select('id, source, kind, title, body, url, ref_id, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    )
    return (data ?? []).map(rowToNotification)
  },

  async markNotificationsRead(ids) {
    let query = requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    if (ids !== 'all') query = query.in('id', ids)
    check(await query)
  },

  async clearNotifications() {
    check(await requireSupabase().from('notifications').delete().eq('user_id', await userId()))
  },

  async listPushDevices() {
    const { data } = check(
      await requireSupabase()
        .from('push_subscriptions')
        .select('id, endpoint, device_label, last_seen_at, last_success_at')
        .order('last_seen_at', { ascending: false }),
    )
    return (data ?? []).map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      deviceLabel: row.device_label,
      lastSeenAt: row.last_seen_at,
      lastSuccessAt: row.last_success_at,
    }))
  },

  async savePushSubscription(subscription, deviceLabel) {
    check(
      await requireSupabase()
        .from('push_subscriptions')
        .upsert(
          {
            user_id: await userId(),
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh,
            auth: subscription.keys?.auth,
            device_label: deviceLabel,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' },
        ),
    )
  },

  async deletePushDevice(id) {
    check(await requireSupabase().from('push_subscriptions').delete().eq('id', id))
  },

  async createReminder(reminder) {
    check(
      await requireSupabase()
        .from('reminders')
        .insert({
          user_id: await userId(),
          source: reminder.source,
          kind: reminder.kind,
          ref_id: reminder.refId ?? null,
          title: reminder.title,
          body: reminder.body ?? '',
          url: reminder.url ?? '/',
          actions: reminder.actions ?? [],
          snoozed: reminder.snoozed ?? false,
          offset_minutes: reminder.offsetMinutes ?? null,
          send_at: reminder.sendAt.toISOString(),
        }),
    )
  },

  async cancelReminders(refId) {
    check(await requireSupabase().from('reminders').delete().eq('ref_id', refId).is('sent_at', null))
  },

  async listRows<T extends { id: string }>(table: AppTable) {
    const { data } = check(await requireSupabase().from(table).select('*').order('created_at'))
    // created_at / updated_at sont conservés (tri, affichage) ; la base les tient à jour.
    return (data ?? []).map(({ user_id: _userId, ...row }) => row) as T[]
  },

  async upsertRows(table, rows) {
    if (rows.length) check(await requireSupabase().from(table).upsert(rows))
  },

  async deleteRows(table, ids) {
    if (ids.length) check(await requireSupabase().from(table).delete().in('id', ids))
  },

  async dispatchNow() {
    const { error } = await requireSupabase().functions.invoke('dispatch-reminders', { body: {} })
    if (error) throw new Error(error.message)
  },

  subscribe(table, onChange) {
    const supabase = requireSupabase()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    void userId().then((id) => {
      if (cancelled) return
      channel = supabase
        .channel(`${table}:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${id}` }, (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Record<string, unknown>
          onChange(row ?? {}, payload.eventType)
        })
        .subscribe()
    })
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  },
}
