import { useEffect, useState } from 'react'
import { Logo } from '../ui/Logo'

/**
 * Total duration of the entry (must match the end of `splash-out` in theme.css:
 * 1550 + 250 ms). The stamp stays still on screen for ~1s, to leave time to see it.
 */
export const SPLASH_DURATION_MS = 1800

/** `true` if the user asked for "reduce motion" in the system (accessibility). */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Entry animation: the stamp "stamps", a red bar runs underneath and the
 * screen disappears. Shows only when opening the app (it is outside the router, so
 * switching tabs does not repeat it). With "reduce motion" on, it does not show.
 */
export function Splash() {
  // The function passed to useState only runs on the first render.
  const [visible, setVisible] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    if (!visible) {
      return
    }
    const id = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    // aria-hidden: it is visual only; screen readers go straight to the app.
    <div
      aria-hidden="true"
      data-testid="splash"
      // A tap skips the entry: whoever opens the app at the gym wants the workout, not the animation.
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-splash-out"
    >
      <div className="flex flex-col items-center gap-6">
        <Logo variant="stamp" className="h-44 w-auto animate-splash-stamp" />
        <div className="h-1.5 w-28 origin-left bg-accent animate-splash-bar" />
      </div>
    </div>
  )
}
