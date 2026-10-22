import { useEffect, useState } from 'react'
import type { LayoutKind } from './types'

/**
 * Type d'appareil, d'après la taille de l'écran (et non de la fenêtre) : un téléphone reste
 * « mobile » en paysage, et une fenêtre de PC réduite garde la disposition PC (réorganisée).
 */
export function detectLayoutKind(): LayoutKind {
  const shortSide = Math.min(window.screen.width, window.screen.height)
  return shortSide < 600 ? 'mobile' : 'desktop'
}

export function useLayoutKind(): LayoutKind {
  const [kind, setKind] = useState(detectLayoutKind)
  useEffect(() => {
    const onResize = () => setKind(detectLayoutKind())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return kind
}
