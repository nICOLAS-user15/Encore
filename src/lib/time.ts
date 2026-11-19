import type { Timestamp } from '../db/types'

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Stopwatch: 83_000 ms -> "1:23" | 3_725_000 ms -> "1:02:05".
 * Negative values become "0:00".
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

/** Countdown: rounds up, so 89.2 s still shows "1:30". */
export function formatCountdown(ms: number): string {
  return formatClock(Math.ceil(ms / 1000) * 1000)
}

/**
 * TODO (exercise 3): workout duration, as text, for the History.
 *
 * The version below is a placeholder that only shows minutes ("75 min").
 * Implement the full format:
 *   - less than 1 hour:  "0 min", "45 min"
 *   - 1 hour or more:   "1h 05min", "2h 00min" (minutes always 2 digits)
 *   - always rounding DOWN to whole minutes (59.9 s -> "0 min")
 *
 * Tips: `Math.floor`, the `%` operator (remainder of the division) and the `pad` at the top.
 * Ready-made tests in `time.test.ts`: change `describe.skip` to `describe`.
 */
export function formatDuration(ms: number): string {
  return `${Math.floor(ms / 60_000)} min`
}

/** Short workout date. pt-BR: "seg., 18 de nov." | en-US: "Mon, Nov 18" */
export function formatWorkoutDate(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Long date. pt-BR: "segunda-feira, 18 de novembro" */
export function formatLongDate(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Time. pt-BR: "18:42" | en-US: "06:42 PM" */
export function formatTime(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
