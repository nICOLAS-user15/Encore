import { describe, expect, it } from 'vitest'
import { formatDecimal, formatReference, formatSetsSummary, formatVolume } from './format'

describe('formatação por idioma', () => {
  it('português usa vírgula decimal; inglês usa ponto', () => {
    expect(formatDecimal(12.5, 'pt')).toBe('12,5')
    expect(formatDecimal(12.5, 'en')).toBe('12.5')
  })

  it('separador de milhar do volume segue o idioma', () => {
    expect(formatVolume(12340.6, 'pt')).toBe('12.341 kg')
    expect(formatVolume(12340.6, 'en')).toBe('12,341 kg')
  })

  it('resume séries com a mesma carga numa linha só', () => {
    const sets = [
      { weightKg: 27.5, reps: 8 },
      { weightKg: 27.5, reps: 7 },
    ]
    expect(formatSetsSummary(sets, 'pt')).toBe('27,5 kg × 8, 7')
    expect(formatSetsSummary(sets, 'en')).toBe('27.5 kg × 8, 7')
  })

  it('referência sem reps mostra só a carga', () => {
    expect(formatReference(15, null)).toBe('15 kg')
    expect(formatReference(25, 8)).toBe('25 kg × 8')
  })
})
