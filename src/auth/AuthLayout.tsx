import type { ReactNode } from 'react'

/** Mise en page commune aux écrans de connexion et de 2FA. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center p-4" style={{ background: 'var(--wallpaper)' }}>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto mb-4 size-14" />
        <h1 className="text-center text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'

export const primaryButtonClass =
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-contrast transition-opacity disabled:opacity-60'

export const secondaryButtonClass =
  'min-h-11 w-full rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-2'
