import type { BodyWeight, Timestamp } from '../../db/types'

/*
 * Body weight swings from day to day (water, salt, digestion): what tells a cut or a
 * bulk apart is the AVERAGE of the last 7 days and how it moves week to week, not
 * today's number. Pure functions: the screen only formats.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export type BodyWeightSummary = {
  /** The most recent measurement, or `null` with none. */
  latestKg: number | null
  /** Average of the last 7 days (rolling), to one decimal; `null` without measurements. */
  weekAverageKg: number | null
  /** That average minus the one of the 7 days before it; `null` when either is empty. */
  weekChangeKg: number | null
}

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

/** One decimal, like a bathroom scale (avoids 82.36666...). */
function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

/** `entries` from oldest to newest (as `listBodyWeights` returns them). */
export function bodyWeightSummary(
  entries: Array<Pick<BodyWeight, 'measuredAt' | 'weightKg'>>,
  now: Timestamp,
): BodyWeightSummary {
  const inWindow = (from: Timestamp, to: Timestamp) =>
    entries
      .filter((entry) => entry.measuredAt > from && entry.measuredAt <= to)
      .map((entry) => entry.weightKg)

  const thisWeek = average(inWindow(now - WEEK_MS, now))
  const weekBefore = average(inWindow(now - 2 * WEEK_MS, now - WEEK_MS))

  return {
    latestKg: entries.at(-1)?.weightKg ?? null,
    weekAverageKg: thisWeek === null ? null : roundTenth(thisWeek),
    weekChangeKg:
      thisWeek === null || weekBefore === null ? null : roundTenth(thisWeek - weekBefore),
  }
}
