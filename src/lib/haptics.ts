/**
 * Short vibration confirming a tap ("the set counted"). Android only: iOS has no
 * Vibration API, so `?.` makes this a no-op there (and on desktop).
 */
export function tapFeedback(): void {
  navigator.vibrate?.(15)
}
