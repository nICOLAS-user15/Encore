import { createContext, useContext } from 'react'
import type { RestTimerControls } from './useRestTimer'

export const RestTimerContext = createContext<RestTimerControls | null>(null)

/** Rest controls (`start`, `add`, `stop`). Requires the RestTimerProvider. */
export function useRest(): RestTimerControls {
  const rest = useContext(RestTimerContext)
  if (rest === null) {
    throw new Error('useRest must be used inside RestTimerProvider')
  }
  return rest
}
