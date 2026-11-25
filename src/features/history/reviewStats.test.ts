import { describe, expect, it } from 'vitest'
import type { SetEntry, Workout } from '../../db/types'
import type { WorkoutSummary } from './historyQueries'
import { reviewOf } from './reviewStats'

const DAY = 24 * 60 * 60 * 1000
const START = new Date(2026, 9, 1).getTime() // October 2026
const END = new Date(2026, 10, 1).getTime()

/** A finished 1-hour workout on day `day` of October with the given completed sets. */
function workout(day: number, sets: Array<Partial<SetEntry>>): WorkoutSummary {
  const startedAt = START + (day - 1) * DAY
  return {
    workout: {
      id: `w${day}`,
      startedAt,
      endedAt: startedAt + 3_600_000,
      timerStartedAt: null,
      timerStoppedAt: null,
    } as Workout,
    routineName: null,
    sets: sets.map(
      (set, index) =>
        ({
          id: `s${day}-${index}`,
          workoutId: `w${day}`,
          type: 'normal',
          completedAt: startedAt,
          exerciseId: 'bench',
          weightKg: 100,
          reps: 5,
          ...set,
        }) as SetEntry,
    ),
  }
}

describe('reviewOf', () => {
  it('adds up workouts, time, sets and volume (warm-up out)', () => {
    const review = reviewOf(
      [workout(2, [{}, { type: 'warmup' }]), workout(5, [{}, {}])],
      { start: START, end: END },
      END,
    )

    expect(review).toMatchObject({
      workouts: 2,
      durationMs: 2 * 3_600_000,
      sets: 3,
      volumeKg: 1500,
    })
  })

  it('frequency counts only the part of the period that already happened', () => {
    const summaries = [
      workout(1, [{}]),
      workout(3, [{}]),
      workout(8, [{}]),
      workout(10, [{}]),
    ]

    // Two weeks into the month: 4 workouts = 2 a week.
    expect(
      reviewOf(summaries, { start: START, end: END }, START + 14 * DAY).perWeek,
    ).toBe(2)
  })

  it('finds the exercise that improved the most and the one done the most', () => {
    const review = reviewOf(
      [
        workout(2, [{ weightKg: 100 }, { exerciseId: 'squat', weightKg: 100 }]),
        workout(9, [{ weightKg: 110 }, { exerciseId: 'squat', weightKg: 105 }]),
        workout(16, [{ exerciseId: 'squat', weightKg: 100 }, { exerciseId: 'squat' }]),
      ],
      { start: START, end: END },
      END,
    )

    expect(review.mostImproved).toEqual({ exerciseId: 'bench', percent: 10 })
    expect(review.mostDone).toEqual({ exerciseId: 'squat', sessions: 3 })
  })

  it('no improvement and bodyweight work give no "most improved"', () => {
    const review = reviewOf(
      [workout(2, [{ weightKg: 0 }]), workout(9, [{ weightKg: 0, reps: 10 }])],
      { start: START, end: END },
      END,
    )

    expect(review.mostImproved).toBeNull()
  })
})
