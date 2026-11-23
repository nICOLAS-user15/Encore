import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import { compareWorkouts, volumeChangePercent } from './compareWorkouts'

function set(
  weightKg: number,
  reps: number,
  type: SetEntry['type'] = 'normal',
): SetEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    workoutId: 'w',
    exerciseId: 'e',
    position: 0,
    weightKg,
    reps,
    type,
    completedAt: 1,
  }
}

/** Workout that lasted `minutes` minutes (timer started and stopped). */
function workout(minutes: number) {
  return {
    startedAt: 0,
    endedAt: minutes * 60_000,
    timerStartedAt: 0,
    timerStoppedAt: minutes * 60_000,
  }
}

describe('compareWorkouts', () => {
  it('shows how much volume, sets and duration changed', () => {
    const previous = { workout: workout(60), sets: [set(25, 8), set(25, 8)] } // 400 kg
    const today = { workout: workout(55), sets: [set(25, 10), set(25, 10), set(25, 8)] } // 700 kg

    expect(compareWorkouts(today, previous)).toEqual({
      volumeKg: 300,
      sets: 1,
      durationMin: -5,
    })
  })

  it('warm-up is not part of the comparison', () => {
    const previous = { workout: workout(50), sets: [set(25, 8)] }
    const today = { workout: workout(50), sets: [set(25, 8), set(12.5, 8, 'warmup')] }

    expect(compareWorkouts(today, previous)).toEqual({
      volumeKg: 0,
      sets: 0,
      durationMin: 0,
    })
  })
})

describe('volumeChangePercent', () => {
  it('is the whole-percent change of volume against the previous time', () => {
    const previous = { sets: [set(25, 8), set(25, 8)] } // 400 kg
    expect(volumeChangePercent({ sets: [set(27, 8), set(27, 8)] }, previous)).toBe(8)
    expect(volumeChangePercent({ sets: [set(25, 8), set(25, 7)] }, previous)).toBe(-6)
    expect(volumeChangePercent({ sets: [set(25, 8), set(25, 8)] }, previous)).toBe(0)
  })

  it('without volume last time (bodyweight only) there is no percentage', () => {
    expect(volumeChangePercent({ sets: [set(10, 8)] }, { sets: [set(0, 12)] })).toBeNull()
  })
})
