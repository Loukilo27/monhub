import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AssistantPanel } from './AssistantPanel'
import { AssistantContext } from './useAssistantPanel'

/** Rend l'assistant disponible partout : bouton de la barre d'état, bouton flottant, Ctrl+K. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((value) => !value), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ open: () => setOpen(true), toggle }), [toggle])

  return (
    <AssistantContext.Provider value={value}>
      {children}
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </AssistantContext.Provider>
  )
}
