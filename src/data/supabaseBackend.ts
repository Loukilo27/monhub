import type { Layout, LayoutKind } from '../home/types'
import { requireSupabase } from '../lib/supabase'
import { isThemePreference } from '../theme/theme'
import { FunctionError, type AppNotification, type AppTable, type Backend, type FileBucket, type Preferences, type Settings } from './backend'

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

  async saveSettings(patch, editedAt) {
    const row: Record<string, unknown> = { user_id: await userId(), updated_at: editedAt ?? new Date().toISOString() }
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

  async saveLayout(kind: LayoutKind, layout: Layout, editedAt?: string) {
    check(
      await requireSupabase()
        .from('layouts')
        .upsert({ user_id: await userId(), kind, items: layout.items, page_count: layout.pageCount, updated_at: editedAt ?? new Date().toISOString() }),
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

  async listRows<T extends { id: string }>(table: AppTable, options?: { columns?: string; filter?: Record<string, string> }) {
    let query = requireSupabase().from(table).select(options?.columns ?? '*')
    if (options?.filter) query = query.match(options.filter)
    const { data } = check(await query.order('created_at'))
    // created_at / updated_at sont conservés (tri, affichage) ; la base les tient à jour.
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(({ user_id: _userId, ...row }) => row) as T[]
  },

  async upsertRows(table, rows, editedAt) {
    // updated_at = heure de la modification (et non celle lue avec la ligne) : voir la migration hors_ligne.
    const updatedAt = editedAt ?? new Date().toISOString()
    if (rows.length) check(await requireSupabase().from(table).upsert(rows.map((row) => ({ ...row, updated_at: updatedAt }))))
  },

  async deleteRows(table, ids) {
    if (ids.length) check(await requireSupabase().from(table).delete().in('id', ids))
  },

  async dispatchNow() {
    const { error } = await requireSupabase().functions.invoke('dispatch-reminders', { body: {} })
    if (error) throw new Error(error.message)
  },

  async uploadFile(bucket: FileBucket, name: string, data: Blob) {
    check(await requireSupabase().storage.from(bucket).upload(`${await userId()}/${name}`, data, { contentType: data.type, upsert: true }))
  },

  async downloadFile(bucket: FileBucket, name: string) {
    const { data } = check(await requireSupabase().storage.from(bucket).download(`${await userId()}/${name}`))
    if (!data) throw new Error('Fichier introuvable.')
    return data
  },

  async fileUrls(bucket: FileBucket, names: string[]) {
    if (!names.length) return {}
    const folder = await userId()
    const { data } = check(await requireSupabase().storage.from(bucket).createSignedUrls(names.map((name) => `${folder}/${name}`), 3600))
    return Object.fromEntries((data ?? []).filter((item) => item.signedUrl && item.path).map((item) => [item.path!.slice(folder.length + 1), item.signedUrl as string]))
  },

  async removeFiles(bucket: FileBucket, names: string[]) {
    if (!names.length) return
    const folder = await userId()
    await requireSupabase().storage.from(bucket).remove(names.map((name) => `${folder}/${name}`))
  },

  async callFunction<T>(name: string, body: Record<string, unknown>) {
    const { data, error } = await requireSupabase().functions.invoke(name, { body })
    if (error) {
      // Corps JSON { error, message } renvoyé par nos fonctions en cas d'échec.
      const response = (error as { context?: Response }).context
      const details = response ? ((await response.json().catch(() => null)) as { error?: string; message?: string } | null) : null
      throw new FunctionError(details?.error ?? 'network', details?.message ?? 'Service indisponible. Vérifie ta connexion.', response?.status ?? 0)
    }
    return data as T
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
