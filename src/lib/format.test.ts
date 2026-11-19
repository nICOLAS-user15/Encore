import { describe, expect, it } from 'vitest'
import { formatDecimal, formatReference, formatSetsSummary, formatVolume } from './format'

describe('formatting by language', () => {
  it('Portuguese uses a decimal comma; English uses a point', () => {
    expect(formatDecimal(12.5, 'pt')).toBe('12,5')
    expect(formatDecimal(12.5, 'en')).toBe('12.5')
  })

  it('the volume thousands separator follows the language', () => {
    expect(formatVolume(12340.6, 'pt')).toBe('12.341 kg')
    expect(formatVolume(12340.6, 'en')).toBe('12,341 kg')
  })

  it('summarizes sets with the same load on a single line', () => {
    const sets = [
      { weightKg: 27.5, reps: 8 },
      { weightKg: 27.5, reps: 7 },
    ]
    expect(formatSetsSummary(sets, 'pt')).toBe('27,5 kg × 8, 7')
    expect(formatSetsSummary(sets, 'en')).toBe('27.5 kg × 8, 7')
  })

  it('a reference without reps shows only the load', () => {
    expect(formatReference(15, null)).toBe('15 kg')
    expect(formatReference(25, 8)).toBe('25 kg × 8')
  })
})
