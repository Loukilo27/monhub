import type { Layout, LayoutKind } from '../home/types'
import { requireSupabase } from '../lib/supabase'
import { isThemePreference } from '../theme/theme'
import type { Backend, Preferences, Settings } from './backend'

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

  subscribe(table, onChange) {
    const supabase = requireSupabase()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    void userId().then((id) => {
      if (cancelled) return
      channel = supabase
        .channel(`${table}:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${id}` }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) onChange(payload.new as Record<string, unknown>)
        })
        .subscribe()
    })
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  },
}
