import { describe, expect, it } from 'vitest'
import {
  formatMonthYear,
  localDay,
  monthGrid,
  monthKey,
  monthSpan,
  weekdayInitials,
} from './calendar'

describe('localDay', () => {
  it('uses the local calendar day, with zero padding', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDay(new Date(2026, 10, 23, 0, 0))).toBe('2026-11-23')
  })
})

describe('monthGrid', () => {
  it('starts on Monday and pads the first and last week', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const grid = monthGrid(2026, 10)

    expect(grid).toHaveLength(42) // 6 blanks + 30 days + 6 blanks
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(grid[6]).toEqual(new Date(2026, 10, 1))
    expect(grid[35]).toEqual(new Date(2026, 10, 30))
    expect(grid.length % 7).toBe(0)
  })

  it('a month that starts on Monday has no leading blanks', () => {
    // June 2026 starts on a Monday.
    expect(monthGrid(2026, 5)[0]).toEqual(new Date(2026, 5, 1))
  })
})

describe('month and weekday names', () => {
  it('follow the language', () => {
    expect(formatMonthYear(new Date(2026, 10, 23), 'pt-BR')).toBe('novembro de 2026')
    expect(formatMonthYear(new Date(2026, 10, 23), 'en-US')).toBe('November 2026')
    expect(weekdayInitials('en-US')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })
})

describe('monthSpan', () => {
  it('goes back across the year and ends at the next month', () => {
    const now = new Date(2026, 0, 15, 10, 0).getTime() // January 2026

    expect(monthSpan(now)).toEqual({
      year: 2026,
      month: 0,
      start: new Date(2026, 0, 1).getTime(),
      end: new Date(2026, 1, 1).getTime(),
    })
    expect(monthSpan(now, -1)).toMatchObject({ year: 2025, month: 11 })
  })

  it('monthKey uses the local month', () => {
    expect(monthKey(new Date(2026, 10, 30, 23, 59).getTime())).toBe('2026-11')
  })
})
