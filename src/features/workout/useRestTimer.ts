import { useState } from 'react'

// The rest duration comes from Settings (settings.restSeconds).

const STORAGE_KEY = 'encore:restEndsAt'

/*
 * The rest end time is kept in localStorage to survive switching tabs or
 * closing the app. It is only a convenience: if the browser blocks storage,
 * the timer keeps working while the screen is open.
 */
function readStored(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    // A rest that already ended (the app was closed): disappears, instead of beeping late.
    if (!value || value <= Date.now()) {
      return null
    }
    return value
  } catch {
    return null
  }
}

function writeStored(value: number | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  } catch {
    // No storage available: continues with in-memory state only.
  }
}

export type RestTimerControls = {
  /** Time (ms) when the rest ends, or `null` if there is no rest. */
  endsAt: number | null
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

export function useRestTimer(): RestTimerControls {
  const [endsAt, setEndsAtState] = useState<number | null>(readStored)

  function setEndsAt(value: number | null) {
    writeStored(value)
    setEndsAtState(value)
  }

  return {
    endsAt,
    start: (seconds) => setEndsAt(Date.now() + seconds * 1000),
    // If the rest already ended, the +15s count from now.
    add: (seconds) => setEndsAt(Math.max(Date.now(), endsAt ?? 0) + seconds * 1000),
    stop: () => setEndsAt(null),
  }
}
