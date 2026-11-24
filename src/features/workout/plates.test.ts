import { describe, expect, it } from 'vitest'
import { platesPerSide } from './plates'

const GYM = [25, 20, 15, 10, 5, 2.5, 1.25]

describe('platesPerSide', () => {
  it('splits an exact load into the fewest plates per side', () => {
    expect(platesPerSide(100, 20, GYM)).toEqual({ plates: [25, 15], missingKg: 0 })
    expect(platesPerSide(62.5, 20, GYM)).toEqual({ plates: [20, 1.25], missingKg: 0 })
  })

  it('only the bar, and lighter than the bar', () => {
    expect(platesPerSide(20, 20, GYM)).toEqual({ plates: [], missingKg: 0 })
    expect(platesPerSide(15, 20, GYM)).toBeNull()
  })

  it('says how much is missing when the plates cannot make the load', () => {
    // 61 kg: 20.5 a side; the closest below is 20 a side, 1 kg short in total.
    expect(platesPerSide(61, 20, GYM)).toEqual({ plates: [20], missingKg: 1 })
  })

  it('does not go "biggest first" when that fails', () => {
    // Only 15s and 10s: 20 kg a side is 10 + 10, not 15 + (nothing).
    expect(platesPerSide(60, 20, [15, 10])).toEqual({ plates: [10, 10], missingKg: 0 })
  })

  it('uses only the plates the gym has', () => {
    expect(platesPerSide(30, 20, [10, 2.5])).toEqual({
      plates: [2.5, 2.5],
      missingKg: 0,
    })
    expect(platesPerSide(30, 20, [])).toEqual({ plates: [], missingKg: 10 })
  })
})
