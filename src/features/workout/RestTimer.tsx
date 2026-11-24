import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/context'
import { playRestBeep } from '../../lib/beep'
import { cn } from '../../lib/cn'
import { formatCountdown } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { DockItem } from '../../ui/BottomDock'
import { Button } from '../../ui/Button'
import { RestRir } from './RestRir'

type RestTimerProps = {
  endsAt: number
  /** Play the beep when the rest ends (Settings option). */
  sound: boolean
  /** The set that started the rest: asks for its reps in reserve (absent = no question). */
  setId?: string | null
  onAdd: () => void
  onDismiss: () => void
}

/** After the first alert, how many more times it repeats (vibration + beep). */
const REST_ALERT_REPEATS = 3
/** Time between the repeated alerts. */
const REST_ALERT_INTERVAL_MS = 4_000

/**
 * Plays the `flash` animation once on the overlay. Removing the class and forcing a
 * layout (`offsetWidth`) restarts the animation if a previous rest already played it.
 */
function flashScreen(element: HTMLElement | null) {
  if (!element) {
    return
  }
  element.classList.remove('animate-flash')
  void element.offsetWidth
  element.classList.add('animate-flash')
}

/** Rest bar, in the dock above the tabs. */
export function RestTimer({
  endsAt,
  sound,
  setId = null,
  onAdd,
  onDismiss,
}: RestTimerProps) {
  const { t } = useI18n()
  const now = useNow(250)
  const remaining = endsAt - now
  const finished = remaining <= 0

  // Only alerts on the "counting" to "finished" transition that happened with the bar on screen:
  // a bar that is born already finished (e.g. reopening the app) does not beep at the wrong time.
  const armed = useRef(false)
  const flashRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!finished) {
      armed.current = true
      return
    }
    if (!armed.current) {
      return
    }
    armed.current = false

    function alert() {
      // Vibrates on Android. The iPhone has no such API, so `?.` avoids the error.
      navigator.vibrate?.([200, 100, 200])
      if (sound) {
        playRestBeep()
      }
    }
    alert()
    flashScreen(flashRef.current)

    // With the phone in a pocket one buzz is easy to miss: it repeats until the bar is
    // dismissed (unmount) or extended (+15s), but only a few times, so a forgotten phone
    // does not keep beeping on the bench.
    let repeats = 0
    const id = window.setInterval(() => {
      alert()
      repeats++
      if (repeats >= REST_ALERT_REPEATS) {
        window.clearInterval(id)
      }
    }, REST_ALERT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [finished, sound])

  return (
    <DockItem>
      {/* Full-screen flash at the end of the rest: invisible and untouchable the rest of the time.
          In <body> (portal): the dock animates with `transform`, which would trap a `fixed` child. */}
      {createPortal(
        <div
          ref={flashRef}
          aria-hidden="true"
          data-testid="rest-flash"
          className="pointer-events-none fixed inset-0 z-50 bg-text opacity-0"
        />,
        document.body,
      )}
      {/* Two layers: the outer one rises from the dock when it appears; the inner one gives the jolt at the end. */}
      <div>
        {/* The timer itself is not announced every second; only the end, for screen readers. */}
        <p role="status" className="sr-only">
          {finished ? t.workout.rest.over : ''}
        </p>
        <div
          role="timer"
          aria-label={t.workout.rest.label}
          className={cn(
            'flex items-center justify-between gap-3 border-2 border-text bg-surface-high p-3 shadow-card',
            // The class is only added when it ends: the animation runs once at that moment.
            finished && 'animate-nudge',
          )}
        >
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">
              {finished ? t.workout.rest.over : t.workout.rest.label}
            </p>
            <p className="font-display text-4xl leading-none font-bold tabular-nums">
              {finished ? t.workout.rest.go : formatCountdown(remaining)}
            </p>
          </div>
          <div className="flex gap-2">
            {!finished && <Button onClick={onAdd}>{t.workout.rest.add15}</Button>}
            <Button variant={finished ? 'secondary' : 'ghost'} onClick={onDismiss}>
              {finished ? t.workout.rest.ok : t.workout.rest.skip}
            </Button>
          </div>
        </div>
        {setId && <RestRir setId={setId} />}
      </div>
    </DockItem>
  )
}
