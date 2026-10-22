import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Taille d'un widget en cases de grille : colonnes × lignes. */
export interface WidgetSize {
  w: number
  h: number
}

export interface WidgetProps {
  size: WidgetSize
  /** Réglages enregistrés avec ce widget sur l'accueil (ex. la note choisie). */
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}

export interface WidgetDefinition {
  /** Identifiant unique au sein de la mini-appli (ex. « horloge »). */
  id: string
  name: string
  sizes: WidgetSize[]
  Component: LazyExoticComponent<ComponentType<WidgetProps>>
}

/** Action exposée à l'assistant IA (function calling, phase 10). */
export interface AiActionDefinition {
  name: string
  description: string
  /** Demande une confirmation avant exécution (création / suppression). */
  requiresConfirmation: boolean
}

export interface MiniApp {
  /** Identifiant stable, utilisé dans l'URL (#/app/<id>) et dans les dispositions enregistrées. */
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** Couleur de la tuile d'icône. */
  color: string
  Page: LazyExoticComponent<ComponentType>
  widgets: WidgetDefinition[]
  aiActions: AiActionDefinition[]
}
