import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import type { ID } from '../../db/types'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  addExerciseToWorkout,
  addSet,
  deleteWorkout,
  finishWorkout,
  followWeightChange,
  pauseWorkoutTimer,
  removeExerciseFromWorkout,
  restoreSets,
  restoreWorkout,
  REOPEN_WINDOW_MS,
  resumeWorkoutTimer,
  setSetCompleted,
  startOrSwitchWorkout,
  startWorkout,
  startWorkoutTimer,
  toggleSetCompleted,
  updateSet,
} from './workoutActions'
import { getActiveWorkout, listFinishedWorkouts, listWorkoutSets } from './workoutQueries'
import { groupSetsByExercise, timerElapsedMs, workoutDurationMs } from './workoutStats'

let db: EncoreDB
let upperA: ID
let benchPress: ID

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await importTestProgram(db)
  const [first] = await listRoutinesWithExercises(db)
  upperA = first.routine.id
  benchPress = first.items[0].exerciseId
})

afterEach(async () => {
  await db.delete()
})

describe('startWorkout', () => {
  it('free workout starts with no sets and becomes active', async () => {
    const workout = await startWorkout(db, null)

    expect(workout.endedAt).toBeNull()
    expect(await listWorkoutSets(db, workout.id)).toEqual([])
    expect((await getActiveWorkout(db))?.id).toBe(workout.id)
  })

  it('does not create a second workout if one is already in progress', async () => {
    const first = await startWorkout(db, null)
    const second = await startWorkout(db, upperA)

    expect(second.id).toBe(first.id)
    expect(await db.workouts.count()).toBe(1)
  })

  it('from the routine, creates the planned sets with the reference', async () => {
    const workout = await startWorkout(db, upperA)
    const sets = await listWorkoutSets(db, workout.id)

    // Upper A: 3 + 3 + 2 + 2 + 2 + 2 + 2 sets
    expect(sets).toHaveLength(16)
    const groups = groupSetsByExercise(sets)
    expect(groups).toHaveLength(7)
    expect(groups[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [25, 8],
      [25, 8],
      [25, 8],
    ])
    // Scott Curl has no reference reps: uses the range minimum (6).
    expect(groups[5].sets[0]).toMatchObject({ weightKg: 15, reps: 6 })
    expect(sets.every((s) => s.completedAt === null && s.type === 'normal')).toBe(true)
  })

  it('in the next workout, fills in with what was done last time', async () => {
    const first = await startWorkout(db, upperA)
    const bench = (await listWorkoutSets(db, first.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    const done = [
      [30, 10],
      [30, 9],
      [27.5, 8],
    ]
    for (const [index, set] of bench.entries()) {
      await updateSet(db, set.id, { weightKg: done[index][0], reps: done[index][1] })
      await toggleSetCompleted(db, set.id)
    }
    await finishWorkout(db, first.id)

    const second = await startWorkout(db, upperA)
    const nextBench = (await listWorkoutSets(db, second.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    expect(nextBench.map((s) => [s.weightKg, s.reps])).toEqual(done)
  })
})

describe('sets', () => {
  it('addSet copies the previous set and marks the type', async () => {
    const workout = await startWorkout(db, upperA)

    const encore = await addSet(db, workout.id, benchPress, 'encore')

    expect(encore).toMatchObject({ weightKg: 25, reps: 8, type: 'encore' })
    const bench = (await listWorkoutSets(db, workout.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    expect(bench).toHaveLength(4)
  })

  it('addExerciseToWorkout creates a zeroed set for an exercise with no history', async () => {
    const workout = await startWorkout(db, null)

    const set = await addExerciseToWorkout(db, workout.id, benchPress)

    expect(set).toMatchObject({ weightKg: 0, reps: 0, position: 0 })
  })

  it('toggleSetCompleted marks and unmarks', async () => {
    const workout = await startWorkout(db, upperA)
    const [set] = await listWorkoutSets(db, workout.id)

    expect(await toggleSetCompleted(db, set.id)).toBe(true)
    expect((await db.setEntries.get(set.id))?.completedAt).toBeTypeOf('number')
    expect(await toggleSetCompleted(db, set.id)).toBe(false)
    expect((await db.setEntries.get(set.id))?.completedAt).toBeNull()
  })
})

describe('finish and delete', () => {
  it('finishWorkout writes endedAt and discards uncompleted sets', async () => {
    const workout = await startWorkout(db, upperA)
    const [first] = await listWorkoutSets(db, workout.id)
    await toggleSetCompleted(db, first.id)

    expect(await finishWorkout(db, workout.id)).toBe('finished')

    expect(await getActiveWorkout(db)).toBeUndefined()
    const finished = await listFinishedWorkouts(db)
    expect(finished.map((w) => w.id)).toEqual([workout.id])
    expect((await listWorkoutSets(db, workout.id)).map((s) => s.id)).toEqual([first.id])
  })

  it('finishWorkout with no completed sets discards the workout', async () => {
    const workout = await startWorkout(db, upperA)

    expect(await finishWorkout(db, workout.id)).toBe('discarded')

    expect(await getActiveWorkout(db)).toBeUndefined()
    expect(await listFinishedWorkouts(db)).toEqual([])
  })

  it('deleteWorkout soft-deletes the workout and the sets', async () => {
    const workout = await startWorkout(db, upperA)

    await deleteWorkout(db, workout.id)

    expect((await db.workouts.get(workout.id))?.deletedAt).toBeTypeOf('number')
    expect(await listWorkoutSets(db, workout.id)).toEqual([])
    expect(await db.setEntries.count()).toBe(16) // the rows are still there
  })
})

describe('workout timer', () => {
  it('starts stopped and starts only once', async () => {
    const workout = await startWorkout(db, upperA)
    expect(workout).toMatchObject({ timerStartedAt: null, timerStoppedAt: null })

    await startWorkoutTimer(db, workout.id)
    const started = (await db.workouts.get(workout.id))?.timerStartedAt
    expect(started).toBeTypeOf('number')

    // Starting again does not "reset" the timer.
    await startWorkoutTimer(db, workout.id)
    expect((await db.workouts.get(workout.id))?.timerStartedAt).toBe(started)
  })

  it('pausing freezes the clock and resuming continues from where it stopped', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(1_000_000)
      const workout = await startWorkout(db, upperA)
      await startWorkoutTimer(db, workout.id)

      vi.setSystemTime(1_000_000 + 60_000) // 1 min of workout
      await pauseWorkoutTimer(db, workout.id)
      vi.setSystemTime(1_000_000 + 360_000) // 5 min paused (bathroom)
      const paused = (await db.workouts.get(workout.id))!
      expect(timerElapsedMs(paused, Date.now())).toBe(60_000)

      await resumeWorkoutTimer(db, workout.id)
      const resumed = (await db.workouts.get(workout.id))!
      expect(resumed.timerPausedAt).toBeNull()
      expect(timerElapsedMs(resumed, Date.now())).toBe(60_000)

      vi.setSystemTime(1_000_000 + 420_000) // 1 more min running
      expect(timerElapsedMs(resumed, Date.now())).toBe(120_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('finishing with the timer paused uses the moment of the pause', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(1_000_000)
      const workout = await startWorkout(db, upperA)
      await startWorkoutTimer(db, workout.id)
      const [first] = await listWorkoutSets(db, workout.id)
      await toggleSetCompleted(db, first.id)

      vi.setSystemTime(1_000_000 + 90_000)
      await pauseWorkoutTimer(db, workout.id)
      vi.setSystemTime(1_000_000 + 600_000)
      await finishWorkout(db, workout.id)

      const finished = (await db.workouts.get(workout.id))!
      expect(workoutDurationMs(finished)).toBe(90_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pausing and resuming when not running/paused does nothing', async () => {
    const workout = await startWorkout(db, upperA)

    await pauseWorkoutTimer(db, workout.id) // not started
    await resumeWorkoutTimer(db, workout.id) // not paused

    expect((await db.workouts.get(workout.id))?.timerPausedAt ?? null).toBeNull()
  })

  it('finishing the workout stops the timer that is still running', async () => {
    const workout = await startWorkout(db, upperA)
    await startWorkoutTimer(db, workout.id)
    const [first] = await listWorkoutSets(db, workout.id)
    await toggleSetCompleted(db, first.id)

    await finishWorkout(db, workout.id)

    const finished = await db.workouts.get(workout.id)
    expect(finished?.timerStoppedAt).toBe(finished?.endedAt)
  })
})

describe('undoing deletions', () => {
  it('removing an exercise returns the ids and restoreSets brings the sets back', async () => {
    const workout = await startWorkout(db, upperA)
    const before = await listWorkoutSets(db, workout.id)

    const removed = await removeExerciseFromWorkout(db, workout.id, benchPress)
    expect(removed.length).toBeGreaterThan(0)
    expect(await listWorkoutSets(db, workout.id)).toHaveLength(
      before.length - removed.length,
    )

    await restoreSets(db, removed)

    expect(await listWorkoutSets(db, workout.id)).toHaveLength(before.length)
  })

  it('restoreWorkout undoes deleteWorkout (workout and sets)', async () => {
    const workout = await startWorkout(db, upperA)
    const before = await listWorkoutSets(db, workout.id)

    const setIds = await deleteWorkout(db, workout.id)
    expect(await getActiveWorkout(db)).toBeFalsy()

    await restoreWorkout(db, workout.id, setIds)

    expect((await getActiveWorkout(db))?.id).toBe(workout.id)
    expect(await listWorkoutSets(db, workout.id)).toHaveLength(before.length)
  })
})

describe('load that carries over to the next sets', () => {
  it('pending sets with the old load move to the new one; hand-adjusted ones stay', async () => {
    const workout = await startWorkout(db, upperA)
    const sets = (await listWorkoutSets(db, workout.id)).filter(
      (set) => set.exerciseId === benchPress && set.type === 'normal',
    )
    const [first, second, third] = sets
    // The 3rd was already adjusted by the user (different load): it must not change.
    await updateSet(db, third.id, { weightKg: 20 })
    const oldKg = first.weightKg

    await updateSet(db, first.id, { weightKg: oldKg + 5 })
    const changed = await followWeightChange(db, first, oldKg, oldKg + 5)

    expect(changed).toBe(1)
    const after = await listWorkoutSets(db, workout.id)
    expect(after.find((set) => set.id === second.id)?.weightKg).toBe(oldKg + 5)
    expect(after.find((set) => set.id === third.id)?.weightKg).toBe(20)
  })
})

describe('switching workouts and atomicity', () => {
  it('double tap on complete does not complete twice (the second undoes it)', async () => {
    const workout = await startWorkout(db, upperA)
    const [first] = await listWorkoutSets(db, workout.id)

    const results = await Promise.all([
      toggleSetCompleted(db, first.id),
      toggleSetCompleted(db, first.id),
    ])

    expect(results).toEqual([true, false])
  })

  it('startOrSwitchWorkout: continues the same one, switches if nothing was done, blocks if there were sets', async () => {
    const [, second] = await listRoutinesWithExercises(db)
    const a = await startOrSwitchWorkout(db, upperA)
    expect(a.status).toBe('started')
    const again = await startOrSwitchWorkout(db, upperA)
    expect(again.status === 'started' && again.workout.id).toBe(
      a.status === 'started' && a.workout.id,
    )

    // No completed set: switching routines discards the open workout.
    const switched = await startOrSwitchWorkout(db, second.routine.id)
    expect(switched.status).toBe('started')

    // With one completed set, switching is blocked.
    if (switched.status !== 'started') throw new Error('esperava started')
    const [set] = await listWorkoutSets(db, switched.workout.id)
    await toggleSetCompleted(db, set.id)
    const blocked = await startOrSwitchWorkout(db, upperA)
    expect(blocked.status).toBe('blocked')
  })

  it('setSetCompleted: a double tap asks for the same state twice, so the set stays completed', async () => {
    const workout = await startWorkout(db, upperA)
    const [first] = await listWorkoutSets(db, workout.id)

    const results = await Promise.all([
      setSetCompleted(db, first.id, true),
      setSetCompleted(db, first.id, true),
    ])

    expect(results).toEqual([true, false])
    expect((await db.setEntries.get(first.id))?.completedAt).not.toBeNull()
  })

  it('startOrSwitchWorkout: a running timer also counts as begun, so switching is blocked', async () => {
    const [, second] = await listRoutinesWithExercises(db)
    const workout = await startWorkout(db, upperA)
    await startWorkoutTimer(db, workout.id)

    const result = await startOrSwitchWorkout(db, second.routine.id)

    expect(result.status).toBe('blocked')
    expect((await getActiveWorkout(db))?.id).toBe(workout.id)
  })

  it('startOrSwitchWorkout: a workout only opened long ago is replaced by a fresh one', async () => {
    const opened = await startWorkout(db, upperA)
    // Opened just to look, three hours ago (e.g. on another day).
    await db.workouts.update(opened.id, {
      startedAt: Date.now() - REOPEN_WINDOW_MS - 60_000,
    })

    const result = await startOrSwitchWorkout(db, upperA)

    if (result.status !== 'started') throw new Error('expected started')
    expect(result.workout.id).not.toBe(opened.id)
    expect(Date.now() - result.workout.startedAt).toBeLessThan(5_000)
    expect((await db.workouts.get(opened.id))?.deletedAt).not.toBeNull()
  })

  it('does not start a workout from a routine that no longer exists', async () => {
    await expect(startWorkout(db, 'rotina-inexistente')).rejects.toThrow()
  })
})
