import { createContext, useContext } from 'react'

export const AssistantContext = createContext<{ open: () => void; toggle: () => void }>({ open: () => {}, toggle: () => {} })

export function useAssistantPanel() {
  return useContext(AssistantContext)
}
