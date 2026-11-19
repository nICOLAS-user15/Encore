import { useEffect } from 'react'

/**
 * Keeps the screen on while `enabled` is true (Screen Wake Lock API).
 *
 * - The system releases the lock on its own when the app goes to the background;
 *   that is why we request it again when the app becomes visible again.
 * - Browsers without support (or that deny the request) simply go on without
 *   it: the screen turns off as usual, and nothing breaks.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let active = true

    async function request() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        // If the component left the screen while the request was in progress, release.
        if (!active) {
          await lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Denied (low battery, tab in the background...): continues without the lock.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Cleanup: workout ended, option turned off or screen closed.
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release()
    }
  }, [enabled])
}
