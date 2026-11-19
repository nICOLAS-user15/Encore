import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import { bestOf, recordKind, recordSetIds } from './recordsStats'

let nextId = 0
function set(
  weightKg: number,
  reps: number,
  overrides: Partial<Pick<SetEntry, 'type' | 'completedAt'>> = {},
) {
  nextId++
  return {
    id: `set-${nextId}`,
    type: 'normal' as const,
    completedAt: 1,
    weightKg,
    reps,
    ...overrides,
  }
}

describe('bestOf', () => {
  it('takes the heaviest load and the highest estimated 1RM, even from different sets', () => {
    // 105 x 1 is the heaviest load; 100 x 5 has the best 1RM (116.7).
    expect(bestOf([set(100, 5), set(105, 1)])).toEqual({
      weightKg: 105,
      oneRepMax: 116.7,
    })
  })

  it('ignores warm-up, pending and bodyweight sets', () => {
    expect(
      bestOf([
        set(200, 5, { type: 'warmup' }),
        set(200, 5, { completedAt: null }),
        set(0, 12),
      ]),
    ).toBeNull()
  })
})

describe('recordKind', () => {
  const previous = { weightKg: 100, oneRepMax: 116.7 }

  it('a heavier load is a weight record', () => {
    expect(recordKind(set(102.5, 1), previous)).toBe('weight')
  })

  it('same load with more reps beats the estimated 1RM', () => {
    expect(recordKind(set(100, 6), previous)).toBe('oneRepMax')
  })

  it('a tie is not a record', () => {
    expect(recordKind(set(100, 5), previous)).toBeNull()
  })

  it('the first time an exercise is done is not a record', () => {
    expect(recordKind(set(100, 5), null)).toBeNull()
  })

  it('warm-up never counts', () => {
    expect(recordKind(set(150, 5, { type: 'warmup' }), previous)).toBeNull()
  })
})

describe('recordSetIds', () => {
  it('compares each set with everything before it, inside the workout too', () => {
    const first = set(105, 5) // beats 100: record
    const equal = set(105, 5) // ties the set above: not a record
    const better = set(105, 6) // beats the set above: record
    const ids = recordSetIds([first, equal, better], { weightKg: 100, oneRepMax: 116.7 })

    expect([...ids]).toEqual([first.id, better.id])
  })

  it('the first session ever has no records', () => {
    expect(recordSetIds([set(60, 10), set(80, 8)], null).size).toBe(0)
  })
})
