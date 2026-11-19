import { describe, expect, it } from 'vitest'
import { estimateOneRepMax } from './oneRepMax'

// TODO (exercício 2): depois de implementar oneRepMax.ts, troque `describe.skip` por `describe`.
describe.skip('estimateOneRepMax (Epley)', () => {
  it('uma repetição é o próprio 1RM', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
  })

  it('aplica a fórmula e arredonda para 1 casa', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7)
    expect(estimateOneRepMax(100, 10)).toBe(133.3)
    expect(estimateOneRepMax(60, 8)).toBe(76)
  })

  it('devolve 0 para séries inválidas', () => {
    expect(estimateOneRepMax(100, 0)).toBe(0)
    expect(estimateOneRepMax(0, 5)).toBe(0)
    expect(estimateOneRepMax(-20, 5)).toBe(0)
  })

  it('100 x 5 vale mais que 105 x 1', () => {
    expect(estimateOneRepMax(100, 5)).toBeGreaterThan(estimateOneRepMax(105, 1))
  })
})
