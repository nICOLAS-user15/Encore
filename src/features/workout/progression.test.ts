import { describe, expect, it } from 'vitest'
import type { SetType } from '../../db/types'
import { isSuggestionApplied, pendingPlannedSets, suggestNextLoad } from './progression'

/** Short set: [load, reps] ("normal" type unless another is given). */
function sets(...values: Array<[number, number, SetType?]>) {
  return values.map(([weightKg, reps, type = 'normal']) => ({ weightKg, reps, type }))
}

const RANGE_6_10 = { min: 6, max: 10 }

describe('suggestNextLoad (double progression)', () => {
  // Case table: each row is a real gym scenario.
  it.each([
    {
      cenario: 'todas no topo da faixa: sobe a carga e volta ao mínimo',
      last: sets([25, 10], [25, 10], [25, 10]),
      step: 2.5,
      expected: { kind: 'increase', weightKg: 27.5, reps: 6 },
    },
    {
      cenario: 'acima do topo também conta como topo',
      last: sets([25, 12], [25, 11]),
      step: 2.5,
      expected: { kind: 'increase', weightKg: 27.5, reps: 6 },
    },
    {
      cenario: 'uma série abaixo do topo: mesma carga, +1 rep na pior série',
      last: sets([25, 10], [25, 9], [25, 8]),
      step: 2.5,
      expected: { kind: 'reps', weightKg: 25, reps: 9 },
    },
    {
      cenario: 'a meta de reps nunca passa do topo da faixa',
      last: sets([25, 10], [25, 9]),
      step: 2.5,
      expected: { kind: 'reps', weightKg: 25, reps: 10 },
    },
    {
      cenario: 'usa o salto do equipamento (máquina de 5 em 5)',
      last: sets([40, 10], [40, 10]),
      step: 5,
      expected: { kind: 'increase', weightKg: 45, reps: 6 },
    },
    {
      cenario: 'séries de recuo mais leves não atrapalham',
      last: sets([30, 10], [30, 10], [20, 6]),
      step: 2.5,
      expected: { kind: 'increase', weightKg: 32.5, reps: 6 },
    },
    {
      cenario: 'série "encore" (extra) não conta',
      last: sets([25, 10], [25, 10], [25, 4, 'encore']),
      step: 2.5,
      expected: { kind: 'increase', weightKg: 27.5, reps: 6 },
    },
    {
      cenario: 'peso corporal: só repetições, mesmo passando da faixa',
      last: sets([0, 10], [0, 11]),
      step: null,
      expected: { kind: 'reps', weightKg: 0, reps: 11 },
    },
    {
      cenario: 'soma sem lixo de ponto flutuante (22,5 + 2,5 = 25)',
      last: sets([22.5, 10]),
      step: 2.5,
      expected: { kind: 'increase', weightKg: 25, reps: 6 },
    },
  ])('$cenario', ({ last, step, expected }) => {
    expect(suggestNextLoad(last, RANGE_6_10, step)).toEqual(expected)
  })

  it('with no planned sets from last time, suggests nothing', () => {
    expect(suggestNextLoad([], RANGE_6_10, 2.5)).toBeNull()
    expect(suggestNextLoad(sets([25, 8, 'encore']), RANGE_6_10, 2.5)).toBeNull()
  })
})

describe('pending sets and "already applied"', () => {
  const today = [
    { type: 'warmup' as const, weightKg: 12.5, reps: 8, completedAt: null },
    { type: 'normal' as const, weightKg: 25, reps: 8, completedAt: 1 },
    { type: 'normal' as const, weightKg: 27.5, reps: 6, completedAt: null },
    { type: 'normal' as const, weightKg: 27.5, reps: 6, completedAt: null },
  ]

  it('"Aplicar" only changes the planned sets still pending', () => {
    expect(pendingPlannedSets(today)).toHaveLength(2)
  })

  it('recognizes when the pending sets already have the suggestion', () => {
    expect(isSuggestionApplied(today, { weightKg: 27.5, reps: 6 })).toBe(true)
    expect(isSuggestionApplied(today, { weightKg: 25, reps: 9 })).toBe(false)
  })
})
