import { describe, expect, it } from 'vitest'
import { isThemePreference, nextTheme, readStoredTheme, resolveTheme, storeTheme, THEME_STORAGE_KEY } from './theme'

describe('resolveTheme', () => {
  it('respecte un choix explicite quel que soit le système', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('suit le système en mode automatique', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('nextTheme', () => {
  it('cycle Clair → Sombre → Automatique → Clair', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
    expect(nextTheme('system')).toBe('light')
  })
})

describe('stockage du thème', () => {
  it('vaut « system » par défaut ou si la valeur est invalide', () => {
    expect(readStoredTheme()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'violet')
    expect(readStoredTheme()).toBe('system')
  })

  it('relit la valeur enregistrée', () => {
    storeTheme('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('valide les préférences', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference(null)).toBe(false)
  })
})
