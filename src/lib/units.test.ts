import { describe, expect, it } from 'vitest'
import { formatWeight, kgToLb, lbToKg } from './units'

// TODO (exercício 1): depois de implementar units.ts, troque `describe.skip` por `describe`.
describe.skip('units', () => {
  it('converte kg para lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3)
    expect(kgToLb(0)).toBe(0)
  })

  it('converte lb para kg', () => {
    expect(lbToKg(45)).toBeCloseTo(20.412, 3)
  })

  it('ida e volta devolve o valor original', () => {
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 10)
  })

  it('formata em kg com vírgula e sem ",0"', () => {
    expect(formatWeight(102.5, 'kg')).toBe('102,5 kg')
    expect(formatWeight(100, 'kg')).toBe('100 kg')
  })

  it('formata em lb, convertendo e arredondando para 1 casa', () => {
    expect(formatWeight(100, 'lb')).toBe('220,5 lb')
    expect(formatWeight(20, 'lb')).toBe('44,1 lb')
  })
})
