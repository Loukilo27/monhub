import { Monitor, Moon, Sun } from 'lucide-react'
import { useSetTheme } from '../settings/settingsSync'
import { nextTheme, THEME_OPTIONS } from '../theme/theme'
import { useTheme } from '../theme/useTheme'
import { IconButton } from './IconButton'

const ICONS = { light: Sun, dark: Moon, system: Monitor }

/** Bascule Clair → Sombre → Automatique en un clic. */
export function ThemeToggle() {
  const { preference } = useTheme()
  const setTheme = useSetTheme()
  const Icon = ICONS[preference]
  const current = THEME_OPTIONS.find((option) => option.value === preference)?.label
  return (
    <IconButton label={`Thème : ${current} (changer)`} onClick={() => setTheme(nextTheme(preference))}>
      <Icon aria-hidden className="size-5" />
    </IconButton>
  )
}
