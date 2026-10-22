import { Monitor, Moon, Sun } from 'lucide-react'
import { nextTheme, THEME_OPTIONS } from '../theme/theme'
import { useTheme } from '../theme/useTheme'
import { IconButton } from './IconButton'

const ICONS = { light: Sun, dark: Moon, system: Monitor }

/** Bascule Clair → Sombre → Automatique en un clic. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const Icon = ICONS[preference]
  const current = THEME_OPTIONS.find((option) => option.value === preference)?.label
  return (
    <IconButton label={`Thème : ${current} (changer)`} onClick={() => setPreference(nextTheme(preference))}>
      <Icon aria-hidden className="size-5" />
    </IconButton>
  )
}
