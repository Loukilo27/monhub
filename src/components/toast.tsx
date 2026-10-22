import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'error'
type ShowToast = (message: string, tone?: ToastTone) => void

interface ToastEntry {
  id: number
  message: string
  tone: ToastTone
}

const ToastContext = createContext<ShowToast>(() => {})

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert }

/** Petits messages temporaires en bas de l'écran. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const show = useCallback<ShowToast>((message, tone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current.filter((toast) => toast.message !== message), { id, message, tone }].slice(-3))
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),5rem)] z-[60] flex flex-col items-center gap-2"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone]
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className="flex max-w-md items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft"
            >
              <Icon aria-hidden className={`size-4 shrink-0 ${toast.tone === 'error' ? 'text-danger' : 'text-accent'}`} />
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useToast(): ShowToast {
  return useContext(ToastContext)
}
