import { Sparkles } from 'lucide-react'
import { useAssistantPanel } from './useAssistantPanel'

/** Bouton flottant de l'assistant, sur les pages des mini-applis et les réglages. */
export function AssistantFloatingButton() {
  const { open } = useAssistantPanel()
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Assistant (Ctrl+K)"
      title="Assistant (Ctrl+K)"
      className="fixed bottom-[max(env(safe-area-inset-bottom),1.25rem)] left-5 z-20 grid size-12 place-items-center rounded-full bg-surface text-accent shadow-soft ring-1 ring-border hover:bg-surface-2"
    >
      <Sparkles aria-hidden className="size-5" />
    </button>
  )
}
