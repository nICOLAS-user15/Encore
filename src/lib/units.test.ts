import { describe, expect, it } from 'vitest'
import { formatWeight, kgToLb, lbToKg } from './units'

// TODO (exercise 1): after implementing units.ts, change `describe.skip` to `describe`.
describe.skip('units', () => {
  it('converts kg to lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3)
    expect(kgToLb(0)).toBe(0)
  })

  it('converts lb to kg', () => {
    expect(lbToKg(45)).toBeCloseTo(20.412, 3)
  })

  it('round trip returns the original value', () => {
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 10)
  })

  it('formats in kg with a comma and no ",0"', () => {
    expect(formatWeight(102.5, 'kg')).toBe('102,5 kg')
    expect(formatWeight(100, 'kg')).toBe('100 kg')
  })

  it('formats in lb, converting and rounding to 1 decimal place', () => {
    expect(formatWeight(100, 'lb')).toBe('220,5 lb')
    expect(formatWeight(20, 'lb')).toBe('44,1 lb')
  })
})
