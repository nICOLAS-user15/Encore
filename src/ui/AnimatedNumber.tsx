import { useEffect, useState } from 'react'

type AnimatedNumberProps = {
  value: number
  /** Turns the (intermediate) number into the text shown, e.g. `format.volume`. */
  format: (value: number) => string
}

const DURATION_MS = 450

/** Counting up is motion: skip it when the user asked to reduce motion, or when it cannot be known. */
function canAnimate(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * A number that "counts up" to its value when it appears (workout summary). Short and
 * ease-out, so it reads as the app "adding up" the effort. Without motion (or in tests,
 * where `matchMedia` does not exist) it just shows the final value.
 */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const [animate] = useState(canAnimate)
  const [shown, setShown] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate) {
      return
    }
    let frame = 0
    let startedAt: number | null = null
    const from = shown
    const step = (now: number) => {
      startedAt ??= now
      const progress = Math.min(1, (now - startedAt) / DURATION_MS)
      const eased = 1 - (1 - progress) ** 3
      setShown(from + (value - from) * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      }
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
    // `shown` is only the starting point of this run; re-running on every frame would restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, value])

  return <>{format(animate ? Math.round(shown) : value)}</>
}
