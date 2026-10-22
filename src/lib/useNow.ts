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
