import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import { detectPlateau } from './plateau'

type Set = Pick<SetEntry, 'type' | 'weightKg' | 'reps' | 'rir'>

/** A session of three normal sets of `weightKg` × `reps` (optional RIR on each). */
function session(weightKg: number, reps: number, rir: number | null = null): Set[] {
  return Array.from({ length: 3 }, () => ({
    type: 'normal' as const,
    weightKg,
    reps,
    rir,
  }))
}

describe('detectPlateau', () => {
  it('suggests a 10% deload after 3 sessions without beating the best before them', () => {
    const sessions = [session(100, 8), session(100, 8), session(100, 7), session(100, 8)]

    expect(detectPlateau(sessions, 2.5)).toEqual({
      kind: 'deload',
      weightKg: 90,
      reps: 8,
    })
  })

  it('progress in any of the last 3 sessions (more reps counts) is not a plateau', () => {
    expect(
      detectPlateau(
        [session(100, 8), session(100, 8), session(100, 9), session(100, 8)],
        2.5,
      ),
    ).toBeNull()
    expect(
      detectPlateau(
        [session(100, 8), session(102.5, 8), session(100, 8), session(100, 8)],
        2.5,
      ),
    ).toBeNull()
  })

  it('needs more history than the 3 sessions it judges', () => {
    expect(
      detectPlateau([session(100, 8), session(100, 8), session(100, 8)], 2.5),
    ).toBeNull()
  })

  it('a deload session is skipped, not counted as a stall', () => {
    // 100 × 8 four times would be a plateau, but the 90 kg session in the middle was the
    // deload: only 3 heavy sessions after the best are left → not yet.
    const sessions = [session(100, 8), session(100, 8), session(90, 8), session(100, 8)]

    expect(detectPlateau(sessions, 2.5)).toBeNull()
  })

  it('with reps in reserve on the last session, it says to push instead of deloading', () => {
    const sessions = [
      session(100, 8),
      session(100, 8),
      session(100, 8),
      session(100, 8, 2),
    ]

    expect(detectPlateau(sessions, 2.5)).toEqual({ kind: 'push' })
    // Near failure (RIR 0 or 1): deload.
    sessions[3] = session(100, 8, 1)
    expect(detectPlateau(sessions, 2.5)).toMatchObject({ kind: 'deload' })
  })

  it('rounds the deload down to the equipment step', () => {
    const sessions = [session(42, 10), session(42, 10), session(42, 10), session(42, 10)]

    // 42 × 0.9 = 37.8 → 37.5 with 2.5 kg steps, 35 with 5 kg steps.
    expect(detectPlateau(sessions, 2.5)).toMatchObject({ weightKg: 37.5 })
    expect(detectPlateau(sessions, 5)).toMatchObject({ weightKg: 35 })
  })

  it('ignores bodyweight work, warm-up and encore sets', () => {
    const stalled = [session(0, 10), session(0, 10), session(0, 10), session(0, 10)]
    expect(detectPlateau(stalled, null)).toBeNull()

    // An extra heavy encore does not change the planned-set comparison.
    const sessions = [session(100, 8), session(100, 8), session(100, 8), session(100, 8)]
    sessions[3] = [...sessions[3], { type: 'encore', weightKg: 110, reps: 5, rir: null }]
    expect(detectPlateau(sessions, 2.5)).toMatchObject({ kind: 'deload' })
  })
})
