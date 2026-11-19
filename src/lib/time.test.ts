import { describe, expect, it } from 'vitest'
import { formatClock, formatCountdown, formatDuration } from './time'

const MINUTE = 60_000

describe('formatClock', () => {
  it('shows minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(83_000)).toBe('1:23')
  })

  it('shows hours past 60 minutes', () => {
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })

  it('never goes negative', () => {
    expect(formatClock(-5_000)).toBe('0:00')
  })
})

describe('formatCountdown', () => {
  it('rounds up (89.2 s is still 1:30)', () => {
    expect(formatCountdown(89_200)).toBe('1:30')
    expect(formatCountdown(90_000)).toBe('1:30')
  })
})

// TODO (exercise 3): after implementing formatDuration, change `describe.skip` to `describe`.
describe.skip('formatDuration', () => {
  it('less than an hour shows only minutes', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(59_900)).toBe('0 min')
    expect(formatDuration(45 * MINUTE)).toBe('45 min')
  })

  it('from one hour up shows hours and minutes with 2 digits', () => {
    expect(formatDuration(60 * MINUTE)).toBe('1h 00min')
    expect(formatDuration(65 * MINUTE)).toBe('1h 05min')
    expect(formatDuration(125 * MINUTE + 59_000)).toBe('2h 05min')
  })
})
