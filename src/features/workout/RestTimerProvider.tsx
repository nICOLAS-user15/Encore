import type { ReactNode } from 'react'
import { useSettings } from '../settings/useSettings'
import { RestTimerContext } from './restContext'
import { RestTimer } from './RestTimer'
import { useRestTimer } from './useRestTimer'

/*
 * The rest lives ABOVE the screens (in AppLayout), not inside the workout: if the user
 * goes to the History or Settings in the middle of a rest, the bar stays in the dock and
 * the end alert (beep and vibration) happens at the right moment, on any screen.
 */

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const rest = useRestTimer()
  const { settings } = useSettings()

  return (
    <RestTimerContext value={rest}>
      {children}
      {rest.endsAt !== null && (
        <RestTimer
          endsAt={rest.endsAt}
          sound={settings.restSound}
          onAdd={() => rest.add(15)}
          onDismiss={rest.stop}
        />
      )}
    </RestTimerContext>
  )
}
