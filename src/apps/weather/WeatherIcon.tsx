import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { weatherIcon } from './codes'

/** Icône d'un code météo WMO (version de nuit si `isDay` est faux). */
export function WeatherIcon({ code, isDay = true, ...props }: { code: number; isDay?: boolean } & LucideProps) {
  return createElement(weatherIcon(code, isDay), props)
}
