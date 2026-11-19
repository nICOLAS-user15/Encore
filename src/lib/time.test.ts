import { describe, expect, it } from 'vitest'
import { formatClock, formatCountdown, formatDuration } from './time'

const MINUTE = 60_000

describe('formatClock', () => {
  it('mostra minutos e segundos', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(83_000)).toBe('1:23')
  })

  it('mostra horas quando passa de 60 minutos', () => {
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })

  it('nunca fica negativo', () => {
    expect(formatClock(-5_000)).toBe('0:00')
  })
})

describe('formatCountdown', () => {
  it('arredonda para cima (89,2 s ainda é 1:30)', () => {
    expect(formatCountdown(89_200)).toBe('1:30')
    expect(formatCountdown(90_000)).toBe('1:30')
  })
})

// TODO (exercício 3): depois de implementar formatDuration, troque `describe.skip` por `describe`.
describe.skip('formatDuration', () => {
  it('menos de uma hora mostra só minutos', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(59_900)).toBe('0 min')
    expect(formatDuration(45 * MINUTE)).toBe('45 min')
  })

  it('a partir de uma hora mostra horas e minutos com 2 dígitos', () => {
    expect(formatDuration(60 * MINUTE)).toBe('1h 00min')
    expect(formatDuration(65 * MINUTE)).toBe('1h 05min')
    expect(formatDuration(125 * MINUTE + 59_000)).toBe('2h 05min')
  })
})
