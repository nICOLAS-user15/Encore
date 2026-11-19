import { useEffect, useState } from 'react'

/**
 * Returns `Date.now()` and makes the component re-render every `intervalMs`.
 * Useful for timers: the displayed time is always computed from a
 * stored timestamp (e.g. `startedAt`), never by counting "ticks". That way, if the
 * phone pauses JavaScript with the screen off, the time stays correct.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    // Cleanup: stops the interval when the component leaves the screen.
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
