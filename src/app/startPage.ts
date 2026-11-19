/*
 * Start page: when ENTERING the app, the user always starts at Workout.
 *
 * The manifest already says `start_url: '/treino'`, but the browser (or the phone)
 * sometimes reopens the last visited page, for example, a restored tab.
 * So, before the router reads the URL, we switch the address to /treino.
 *
 * Exception: reloading the page (F5 / pull to refresh) stays where it was.
 */

export const START_PATH = '/treino'

/**
 * `navigationType` comes from the browser's Navigation Timing API:
 * 'navigate' (opened), 'reload' (reloaded), 'back_forward' (came back from another site).
 */
export function shouldGoToStartPage(navigationType: string | undefined): boolean {
  return navigationType !== 'reload'
}

/** Takes the URL to the start page, if applicable. Call BEFORE creating the router. */
export function goToStartPage(): void {
  const [entry] = performance.getEntriesByType(
    'navigation',
  ) as PerformanceNavigationTiming[]
  if (shouldGoToStartPage(entry?.type) && window.location.pathname !== START_PATH) {
    // replaceState swaps the address without reloading and without creating a "back" to the old page.
    window.history.replaceState(null, '', START_PATH)
  }
}
