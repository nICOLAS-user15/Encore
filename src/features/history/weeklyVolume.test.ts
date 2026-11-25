import { describe, expect, it } from 'vitest'
import type { MuscleGroup, SetEntry, Workout } from '../../db/types'
import type { WorkoutSummary } from './historyQueries'
import {
  startOfWeek,
  weeklySetsByMuscle,
  weeklyVolumeByMuscle,
  weekStartsBack,
} from './weeklyVolume'

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

describe('weeklySetsByMuscle', () => {
  /** A moment `weeksAgo` weeks before NOW's week (same weekday and hour). */
  const weeksAgo = (weeks: number) => new Date(2026, 10, 18 - weeks * 7, 15).getTime()

  it('counts working sets per muscle in each of the last 8 weeks, oldest first', () => {
    const trends = weeklySetsByMuscle(
      [
        summary(NOW, [{}, {}, { exerciseId: 'squat' }]),
        summary(weeksAgo(1), [{}, { type: 'warmup' }]),
        summary(weeksAgo(7), [{}]),
        summary(weeksAgo(8), [{}, {}, {}]), // before the window
      ],
      exercises,
      NOW,
    )

    expect(trends[0]).toEqual({
      muscleGroup: 'chest',
      sets: [1, 0, 0, 0, 0, 0, 1, 2],
      average: 0.3, // the 4 full weeks before this one: (0 + 0 + 0 + 1) / 4, rounded
    })
    expect(trends[1]).toMatchObject({
      muscleGroup: 'quads',
      sets: [0, 0, 0, 0, 0, 0, 0, 1],
    })
  })

  it('the average uses the 4 full weeks before this one; most trained first', () => {
    const trends = weeklySetsByMuscle(
      [1, 2, 3, 4].flatMap((week) => [
        summary(
          weeksAgo(week),
          Array.from({ length: 12 }, () => ({ exerciseId: 'pullup' })),
        ),
        summary(
          weeksAgo(week) + 1,
          Array.from({ length: 6 }, () => ({})),
        ),
      ]),
      exercises,
      NOW,
    )

    expect(trends.map((trend) => [trend.muscleGroup, trend.average])).toEqual([
      ['back', 12],
      ['chest', 6],
    ])
  })

  it('weeks start on Monday, going back across months', () => {
    expect(weekStartsBack(NOW, 3).map((start) => new Date(start))).toEqual([
      new Date(2026, 10, 2),
      new Date(2026, 10, 9),
      new Date(2026, 10, 16),
    ])
  })
})
