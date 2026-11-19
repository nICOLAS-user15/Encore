import { createContext, useContext } from 'react'
import type { RestTimerControls } from './useRestTimer'

export const RestTimerContext = createContext<RestTimerControls | null>(null)

/** Controles do descanso (`start`, `add`, `stop`). Precisa do RestTimerProvider. */
export function useRest(): RestTimerControls {
  const rest = useContext(RestTimerContext)
  if (rest === null) {
    throw new Error('useRest precisa estar dentro do RestTimerProvider')
  }
  return rest
}
