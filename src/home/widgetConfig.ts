import { createContext } from 'react'

/** Enregistre les réglages d'un widget posé sur l'accueil (fourni par la grille). */
export const WidgetConfigContext = createContext<((itemId: string, config: Record<string, unknown>) => void) | null>(null)
