import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import type { ID } from '../../db/types'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
  updateSet,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'
import { listExerciseSessions } from './exerciseHistory'

let db: EncoreDB
let routineId: ID
let benchPress: ID

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await importTestProgram(db)
  const [first] = await listRoutinesWithExercises(db)
  routineId = first.routine.id
  benchPress = first.items[0].exerciseId
})

afterEach(async () => {
  await db.delete()
})

/** A workout where the first two bench press sets are done with the given values. */
async function train(sets: Array<[number, number]>, finish = true) {
  const workout = await startWorkout(db, routineId)
  const bench = (await listWorkoutSets(db, workout.id)).filter(
    (set) => set.exerciseId === benchPress,
  )
  for (const [index, [weightKg, reps]] of sets.entries()) {
    await updateSet(db, bench[index].id, { weightKg, reps })
    await toggleSetCompleted(db, bench[index].id)
  }
  if (finish) {
    await finishWorkout(db, workout.id)
  }
  return workout
}

describe('listExerciseSessions', () => {
  it('one session per finished workout, oldest first, with the best of each', async () => {
    await train([
      [60, 10],
      [70, 6],
    ])
    await train([[75, 5]])

    const sessions = await listExerciseSessions(db, benchPress)

    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toMatchObject({
      topSet: { weightKg: 70, reps: 6 },
      oneRepMax: 84, // 70 x 6 = 84 beats 60 x 10 = 80
      maxReps: 10,
      sets: 2,
    })
    expect(sessions[1]).toMatchObject({ topSet: { weightKg: 75, reps: 5 }, sets: 1 })
  })

  it('leaves out the workout still in progress', async () => {
    await train([[60, 10]])
    await train([[100, 1]], false)

    expect(await listExerciseSessions(db, benchPress)).toHaveLength(1)
  })
})
