import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import { compareWorkouts } from './compareWorkouts'

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

/** Treino que durou `minutes` minutos (cronômetro iniciado e parado). */
function workout(minutes: number) {
  return {
    startedAt: 0,
    endedAt: minutes * 60_000,
    timerStartedAt: 0,
    timerStoppedAt: minutes * 60_000,
  }
}

describe('compareWorkouts', () => {
  it('mostra quanto mudou em volume, séries e duração', () => {
    const previous = { workout: workout(60), sets: [set(25, 8), set(25, 8)] } // 400 kg
    const today = { workout: workout(55), sets: [set(25, 10), set(25, 10), set(25, 8)] } // 700 kg

    expect(compareWorkouts(today, previous)).toEqual({
      volumeKg: 300,
      sets: 1,
      durationMin: -5,
    })
  })

  it('aquecimento não entra na comparação', () => {
    const previous = { workout: workout(50), sets: [set(25, 8)] }
    const today = { workout: workout(50), sets: [set(25, 8), set(12.5, 8, 'warmup')] }

    expect(compareWorkouts(today, previous)).toEqual({
      volumeKg: 0,
      sets: 0,
      durationMin: 0,
    })
  })
})
