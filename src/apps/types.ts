import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { AiTool } from '../assistant/types'

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
  /** Actions que l'assistant IA peut faire dans cette mini-appli. */
  aiActions: AiTool[]
}
