import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth'
import { requireSupabase } from '../lib/supabase'
import { isThemePreference } from '../theme/theme'
import { useTheme } from '../theme/useTheme'

/**
 * Synchronise le thème avec la table `settings` :
 * - au démarrage, la valeur enregistrée dans Supabase l'emporte (sinon on y enregistre la valeur locale) ;
 * - chaque changement local est envoyé ;
 * - un changement fait sur un autre appareil arrive en temps réel.
 * Le localStorage reste la source immédiate (affichage sans attendre le réseau, hors-ligne).
 */
export function useSettingsSync() {
  const { session } = useAuth()
  const { preference, setPreference } = useTheme()
  const userId = session?.user.id
  // Dernière valeur connue côté serveur, pour ne pas renvoyer ce qu'on vient de recevoir.
  const remoteTheme = useRef<string | null>(null)
  const loaded = useRef(false)
  const localTheme = useRef(preference)
  useEffect(() => {
    localTheme.current = preference
  }, [preference])

  useEffect(() => {
    if (!userId) return
    const supabase = requireSupabase()
    let cancelled = false
    loaded.current = false

    const load = async () => {
      const { data, error } = await supabase.from('settings').select('theme').maybeSingle()
      if (cancelled || error) return
      if (data && isThemePreference(data.theme)) {
        remoteTheme.current = data.theme
        setPreference(data.theme)
      } else if (!data) {
        // Premier démarrage : on crée la ligne de réglages avec le thème local.
        remoteTheme.current = localTheme.current
        await supabase.from('settings').upsert({ user_id: userId, theme: localTheme.current })
      }
      loaded.current = true
    }
    void load()

    const channel = supabase
      .channel(`settings:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${userId}` }, (payload) => {
        const theme = (payload.new as { theme?: unknown }).theme
        if (isThemePreference(theme)) {
          remoteTheme.current = theme
          setPreference(theme)
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [userId, setPreference])

  useEffect(() => {
    if (!userId || !loaded.current || remoteTheme.current === preference) return
    remoteTheme.current = preference
    void requireSupabase().from('settings').upsert({ user_id: userId, theme: preference })
  }, [userId, preference])
}
