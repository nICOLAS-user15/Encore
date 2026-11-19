import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/context'
import { playRestBeep } from '../../lib/beep'
import { cn } from '../../lib/cn'
import { formatCountdown } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { DockItem } from '../../ui/BottomDock'
import { Button } from '../../ui/Button'

type RestTimerProps = {
  endsAt: number
  /** Play the beep when the rest ends (Settings option). */
  sound: boolean
  onAdd: () => void
  onDismiss: () => void
}

/** Rest bar, in the dock above the tabs. */
export function RestTimer({ endsAt, sound, onAdd, onDismiss }: RestTimerProps) {
  const { t } = useI18n()
  const now = useNow(250)
  const remaining = endsAt - now
  const finished = remaining <= 0

  // Only alerts on the "counting" to "finished" transition that happened with the bar on screen:
  // a bar that is born already finished (e.g. reopening the app) does not beep at the wrong time.
  const armed = useRef(false)
  useEffect(() => {
    if (!finished) {
      armed.current = true
      return
    }
    if (armed.current) {
      armed.current = false
      // Vibrates on Android. The iPhone has no such API, so `?.` avoids the error.
      navigator.vibrate?.([200, 100, 200])
      if (sound) {
        playRestBeep()
      }
    }
  }, [finished, sound])

  return (
    <DockItem>
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
            'flex items-center justify-between gap-3 border-2 border-text bg-surface p-3',
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
      </div>
    </DockItem>
  )
}
