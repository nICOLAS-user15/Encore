import { describe, expect, it } from 'vitest'
import type { MuscleGroup, SetEntry, Workout } from '../../db/types'
import type { WorkoutSummary } from './historyQueries'
import { startOfWeek, weeklyVolumeByMuscle } from './weeklyVolume'

// Wednesday, 2026-11-18, 15:00 local time.
const NOW = new Date(2026, 10, 18, 15).getTime()

function summary(startedAt: number, sets: Array<Partial<SetEntry>>): WorkoutSummary {
  return {
    workout: { id: `w-${startedAt}`, startedAt } as Workout,
    routineName: null,
    sets: sets.map(
      (set, index) =>
        ({
          id: `s-${startedAt}-${index}`,
          type: 'normal',
          completedAt: startedAt,
          weightKg: 0,
          reps: 0,
          exerciseId: 'bench',
          ...set,
        }) as SetEntry,
    ),
  }
}

const exercises = new Map<string, { muscleGroup: MuscleGroup }>([
  ['bench', { muscleGroup: 'chest' }],
  ['squat', { muscleGroup: 'quads' }],
  ['pullup', { muscleGroup: 'back' }],
])

describe('startOfWeek', () => {
  it('is Monday at midnight, also when the day is a Sunday', () => {
    expect(new Date(startOfWeek(NOW))).toEqual(new Date(2026, 10, 16))
    expect(new Date(startOfWeek(new Date(2026, 10, 22, 23).getTime()))).toEqual(
      new Date(2026, 10, 16),
    )
  })
})

describe('weeklyVolumeByMuscle', () => {
  it('sums this week per muscle group, most volume first', () => {
    const monday = new Date(2026, 10, 16, 9).getTime()
    const result = weeklyVolumeByMuscle(
      [
        summary(monday, [
          { exerciseId: 'bench', weightKg: 80, reps: 8 }, // 640
          { exerciseId: 'squat', weightKg: 100, reps: 10 }, // 1000
        ]),
        summary(NOW, [{ exerciseId: 'bench', weightKg: 80, reps: 10 }]), // 800
      ],
      exercises,
      NOW,
    )

    expect(result).toEqual([
      { muscleGroup: 'chest', volumeKg: 1440, sets: 2 },
      { muscleGroup: 'quads', volumeKg: 1000, sets: 1 },
    ])
  })

  it('ignores last week, warm-up and pending sets; counts bodyweight sets', () => {
    const lastSunday = new Date(2026, 10, 15, 18).getTime()
    const result = weeklyVolumeByMuscle(
      [
        summary(lastSunday, [{ exerciseId: 'bench', weightKg: 100, reps: 5 }]),
        summary(NOW, [
          { exerciseId: 'bench', weightKg: 40, reps: 10, type: 'warmup' },
          { exerciseId: 'bench', weightKg: 80, reps: 8, completedAt: null },
          { exerciseId: 'pullup', weightKg: 0, reps: 10 },
        ]),
      ],
      exercises,
      NOW,
    )

    expect(result).toEqual([{ muscleGroup: 'back', volumeKg: 0, sets: 1 }])
  })
})
