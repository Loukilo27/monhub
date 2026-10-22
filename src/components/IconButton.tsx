import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

/** Bouton icône carré, zone tactile de 44 px, libellé accessible obligatoire. */
export function IconButton({ label, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative grid size-11 shrink-0 place-items-center rounded-full text-text transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
