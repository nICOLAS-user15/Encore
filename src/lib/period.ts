/*
 * Chart periods. After years of training a chart with every session is a smear; these
 * windows keep it readable. Months are calendar months back from now (local time).
 */

export const PERIODS = ['3m', '1y', 'all'] as const
export type Period = (typeof PERIODS)[number]

/** First moment inside the period (`-Infinity` for "all"). */
export function periodStart(period: Period, now: number): number {
  if (period === 'all') {
    return -Infinity
  }
  const date = new Date(now)
  date.setMonth(date.getMonth() - (period === '3m' ? 3 : 12))
  return date.getTime()
}

/** The items whose date falls in the period (keeps their order). */
export function inPeriod<T>(
  items: readonly T[],
  dateOf: (item: T) => number,
  period: Period,
  now: number,
): T[] {
  const start = periodStart(period, now)
  return items.filter((item) => dateOf(item) >= start)
}
