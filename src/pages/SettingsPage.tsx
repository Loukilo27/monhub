import type { ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader'
import { THEME_OPTIONS } from '../theme/theme'
import { useTheme } from '../theme/useTheme'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Réglages" />
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Section title="Thème">
          <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={preference === option.value}
                onClick={() => setPreference(option.value)}
                className="min-h-11 rounded-lg text-sm font-medium transition-colors aria-checked:bg-surface aria-checked:shadow-soft"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Section>
        <Section title="À propos">
          <p className="text-sm text-muted">
            MonHub version {__APP_VERSION__} — compilée le{' '}
            {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.
          </p>
        </Section>
      </main>
    </div>
  )
}
