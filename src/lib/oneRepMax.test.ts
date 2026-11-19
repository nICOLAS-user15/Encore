import { describe, expect, it } from 'vitest'
import { estimateOneRepMax } from './oneRepMax'

describe('estimateOneRepMax (Epley)', () => {
  it('one repetition is the 1RM itself', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
  })

  it('applies the formula and rounds to 1 decimal place', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7)
    expect(estimateOneRepMax(100, 10)).toBe(133.3)
    expect(estimateOneRepMax(60, 8)).toBe(76)
  })

  it('returns 0 for invalid sets', () => {
    expect(estimateOneRepMax(100, 0)).toBe(0)
    expect(estimateOneRepMax(0, 5)).toBe(0)
    expect(estimateOneRepMax(-20, 5)).toBe(0)
  })

  it('100 x 5 is worth more than 105 x 1', () => {
    expect(estimateOneRepMax(100, 5)).toBeGreaterThan(estimateOneRepMax(105, 1))
  })
})
