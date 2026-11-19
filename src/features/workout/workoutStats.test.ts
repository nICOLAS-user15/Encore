import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import {
  groupSetsByExercise,
  hasWorkoutBegun,
  nextPendingSetId,
  suggestNextRoutineId,
  totalVolumeKg,
  workoutDurationMs,
} from './workoutStats'

/** Creates a fake set with only what matters for the test. */
function makeSet(overrides: Partial<SetEntry>): SetEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    workoutId: 'w1',
    exerciseId: 'a',
    position: 0,
    weightKg: 0,
    reps: 0,
    type: 'normal',
    completedAt: null,
    ...overrides,
  }
}

describe('groupSetsByExercise', () => {
  it('groups by exercise in the order each one appears', () => {
    const sets = [
      makeSet({ exerciseId: 'b', position: 2 }),
      makeSet({ exerciseId: 'a', position: 0 }),
      makeSet({ exerciseId: 'b', position: 1 }),
      makeSet({ exerciseId: 'a', position: 3 }),
    ]

    const groups = groupSetsByExercise(sets)

    expect(groups.map((g) => g.exerciseId)).toEqual(['a', 'b'])
    expect(groups[0].sets.map((s) => s.position)).toEqual([0, 3])
    expect(groups[1].sets.map((s) => s.position)).toEqual([1, 2])
  })
})

describe('suggestNextRoutineId', () => {
  const ids = ['upperA', 'lowerA', 'upperB', 'lowerB']

  it('suggests the routine after the last trained one', () => {
    expect(suggestNextRoutineId(ids, 'upperA')).toBe('lowerA')
    expect(suggestNextRoutineId(ids, 'upperB')).toBe('lowerB')
  })

  it('wraps to the first after the last', () => {
    expect(suggestNextRoutineId(ids, 'lowerB')).toBe('upperA')
  })

  it('with no history (or deleted routine), suggests the first', () => {
    expect(suggestNextRoutineId(ids, null)).toBe('upperA')
    expect(suggestNextRoutineId(ids, 'apagada')).toBe('upperA')
  })

  it('with no routines, suggests nothing', () => {
    expect(suggestNextRoutineId([], null)).toBeNull()
  })
})

describe('totalVolumeKg', () => {
  it('sums load × reps of completed sets only', () => {
    const sets = [
      makeSet({ weightKg: 100, reps: 5, completedAt: 1 }),
      makeSet({ weightKg: 27.5, reps: 8, completedAt: 2 }),
      makeSet({ weightKg: 999, reps: 10, completedAt: null }),
    ]

    expect(totalVolumeKg(sets)).toBe(500 + 220)
  })
})

describe('workoutDurationMs', () => {
  const base = { startedAt: 1_000, endedAt: 100_000 }

  it('uses the timer when it was started and stopped', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: 10_000, timerStoppedAt: 70_000 }),
    ).toBe(60_000)
  })

  it('timer started and not stopped counts until the end of the workout', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: 10_000, timerStoppedAt: null }),
    ).toBe(90_000)
  })

  it('without the timer, estimates from the workout opening and finish', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: null, timerStoppedAt: null }),
    ).toBe(99_000)
  })
})

describe('hasWorkoutBegun', () => {
  it('a workout only opened (no timer, nothing completed) has not begun', () => {
    expect(hasWorkoutBegun({ timerStartedAt: null }, [{ completedAt: null }])).toBe(false)
    expect(hasWorkoutBegun({ timerStartedAt: null }, [])).toBe(false)
  })

  it('begins with the timer or with the first completed set', () => {
    expect(hasWorkoutBegun({ timerStartedAt: 1_000 }, [])).toBe(true)
    expect(
      hasWorkoutBegun({ timerStartedAt: null }, [
        { completedAt: null },
        { completedAt: 5 },
      ]),
    ).toBe(true)
  })
})

describe('nextPendingSetId', () => {
  /**
   * Workout with two exercises, A (3 sets) and B (2 sets).
   * `done` says which sets were completed and at what time.
   */
  function workout(done: Record<string, number> = {}) {
    const ids = ['a1', 'a2', 'a3', 'b1', 'b2']
    const sets = ids.map((id, position) =>
      makeSet({
        id,
        position,
        exerciseId: id[0],
        completedAt: done[id] ?? null,
      }),
    )
    return groupSetsByExercise(sets)
  }

  it('with nothing done, it is the first set', () => {
    expect(nextPendingSetId(workout())).toBe('a1')
  })

  it('moves to the next set of the same exercise', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2 }))).toBe('a3')
  })

  it('exercise finished: goes to the next exercise', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2, a3: 3 }))).toBe('b1')
  })

  it('follows the user when they skip an exercise', () => {
    // Machine for A busy: started with B.
    expect(nextPendingSetId(workout({ b1: 1 }))).toBe('b2')
  })

  it('at the end of the list, goes back to the exercise left behind', () => {
    expect(nextPendingSetId(workout({ b1: 1, b2: 2 }))).toBe('a1')
  })

  it('all done: there is no next', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2, a3: 3, b1: 4, b2: 5 }))).toBeNull()
  })
})
