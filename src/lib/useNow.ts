import { useEffect, useState } from 'react'
import { msUntilNextMinute } from './time'

/** Date courante, rafraîchie au changement de minute. */
export function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, msUntilNextMinute(new Date()) + 50)
    }
    schedule()
    // Après une mise en veille, les minuteurs dérivent : on resynchronise au retour.
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}

/** Date courante rafraîchie chaque seconde, calée sur le changement de seconde. */
export function useNowSecond(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = new Date()
      setNow(current)
      timeout = setTimeout(tick, 1000 - current.getMilliseconds() + 5)
    }
    timeout = setTimeout(tick, 1000 - new Date().getMilliseconds() + 5)
    return () => clearTimeout(timeout)
  }, [])
  return now
}

/** Horodatage rafraîchi à chaque image tant que `active` (chronomètre au centième). */
export function useFrameNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let frame = 0
    const loop = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [active])
  return now
}
