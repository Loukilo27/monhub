import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** Raccourcis globaux PC : Échap = retour à l'accueil (Ctrl+K, l'assistant, est géré par AssistantProvider). */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || pathname === '/') return
      // Laisse Échap fermer d'abord une boîte de dialogue ou quitter un champ en cours d'édition.
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      navigate('/', { viewTransition: true })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, pathname])
}
