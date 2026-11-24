import { describe, expect, it } from 'vitest'
import { inPeriod, periodStart } from './period'

const NOW = new Date(2026, 10, 24, 12, 0).getTime()

describe('chart periods', () => {
  it('3 months and 1 year go back calendar months', () => {
    expect(periodStart('3m', NOW)).toBe(new Date(2026, 7, 24, 12, 0).getTime())
    expect(periodStart('1y', NOW)).toBe(new Date(2025, 10, 24, 12, 0).getTime())
    expect(periodStart('all', NOW)).toBe(-Infinity)
  })

  it('keeps only the items inside the period, in order', () => {
    const dates = [
      new Date(2025, 0, 1).getTime(),
      new Date(2026, 5, 1).getTime(),
      new Date(2026, 10, 1).getTime(),
    ]
    const date = (value: number) => value

    expect(inPeriod(dates, date, '3m', NOW)).toEqual([dates[2]])
    expect(inPeriod(dates, date, '1y', NOW)).toEqual([dates[1], dates[2]])
    expect(inPeriod(dates, date, 'all', NOW)).toEqual(dates)
  })
})
