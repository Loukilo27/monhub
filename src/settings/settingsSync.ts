import { useCallback, useEffect, useRef } from 'react'
import { useSettings, useUpdateSettings } from '../data/queries'
import type { ThemePreference } from '../theme/theme'
import { useTheme } from '../theme/useTheme'

/**
 * Applique le thème enregistré (au démarrage et quand il change sur un autre appareil).
 * Au tout premier démarrage, crée les réglages avec le thème local.
 * Le localStorage reste la source immédiate (affichage sans attendre le réseau, hors-ligne).
 */
export function useSettingsSync() {
  const { preference, setPreference } = useTheme()
  const settings = useSettings()
  const { mutate } = useUpdateSettings()

  const serverTheme = settings.data?.theme
  const noSettingsYet = settings.isSuccess && settings.data === null

  useEffect(() => {
    if (serverTheme) setPreference(serverTheme)
  }, [serverTheme, setPreference])

  // On ne crée la ligne qu'une fois ; le thème choisi ensuite est enregistré par useSetTheme.
  const created = useRef(false)
  useEffect(() => {
    if (!noSettingsYet || created.current) return
    created.current = true
    mutate({ theme: preference })
  }, [noSettingsYet, preference, mutate])
}

/** Change le thème ici et l'enregistre pour les autres appareils. */
export function useSetTheme() {
  const { setPreference } = useTheme()
  const { mutate } = useUpdateSettings()
  return useCallback(
    (theme: ThemePreference) => {
      setPreference(theme)
      mutate({ theme })
    },
    [setPreference, mutate],
  )
}
