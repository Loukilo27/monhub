import {
  Book,
  Briefcase,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  List,
  type LucideIcon,
  Plane,
  ShoppingCart,
  Star,
  User,
  Utensils,
  Wrench,
} from 'lucide-react'

/** Icônes proposées pour les listes (nom enregistré → composant). */
export const LIST_ICONS: Record<string, LucideIcon> = {
  list: List,
  user: User,
  briefcase: Briefcase,
  'shopping-cart': ShoppingCart,
  home: Home,
  heart: Heart,
  book: Book,
  'graduation-cap': GraduationCap,
  dumbbell: Dumbbell,
  plane: Plane,
  utensils: Utensils,
  wrench: Wrench,
  star: Star,
}

export const LIST_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

export function listIcon(name: string): LucideIcon {
  return LIST_ICONS[name] ?? List
}
