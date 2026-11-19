import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import type { Split } from '../../db/types'
import { listWorkoutSummaries } from '../history/historyQueries'
import {
  addExerciseToRoutine,
  createRoutine,
  saveRoutine,
  moveRoutineToSplit,
} from '../routines/routineActions'
import { draftFromRoutine } from '../routines/routineDraft'
import {
  getRoutineWithExercises,
  listRoutinesWithExercises,
} from '../routines/routineQueries'
import { createSplit, deleteSplit, moveSplit, updateSplit } from './splitActions'
import { listSplits } from './splitQueries'
import { lastRoutineIdInSplit, resolveActiveSplit, routinesOfSplit } from './splitUtils'
import {
  addExerciseToWorkout,
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'

let db: EncoreDB

/** The draft of an existing routine, as the editor builds it on open. */
async function draftOf(routineId: string) {
  const entry = await getRoutineWithExercises(db, routineId)
  const all = await listRoutinesWithExercises(db)
  const siblings = all.filter((item) => item.routine.splitId === entry!.routine.splitId)
  const position = siblings.findIndex((item) => item.routine.id === routineId)
  return draftFromRoutine(entry!.routine, entry!.items, position)
}

beforeEach(() => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

describe('splits: create, rename, order', () => {
  it('creates splits at the end of the tabs and renames', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const ppl = await createSplit(db, 'Nova divisão')

    await updateSplit(db, ppl, { name: 'PPL', notes: '6x por semana' })

    const splits = await listSplits(db)
    expect(splits.map((split) => [split.id, split.name])).toEqual([
      [ul, 'Upper / Lower'],
      [ppl, 'PPL'],
    ])
    expect(splits[1].notes).toBe('6x por semana')
  })

  it('changes the split position in the tabs', async () => {
    const a = await createSplit(db, 'A')
    const b = await createSplit(db, 'B')
    const c = await createSplit(db, 'C')

    await moveSplit(db, c, -1)
    expect((await listSplits(db)).map((split) => split.id)).toEqual([a, c, b])

    // At the end, does nothing (and does not break).
    await moveSplit(db, a, -1)
    expect((await listSplits(db)).map((split) => split.id)).toEqual([a, c, b])
  })
})

describe('splits: delete', () => {
  it('deletes an empty split', async () => {
    const id = await createSplit(db, 'Antiga')

    expect(await deleteSplit(db, id)).toBe(0)

    expect(await listSplits(db)).toEqual([])
    expect((await db.splits.get(id))?.deletedAt).toBeTypeOf('number')
  })

  it('deletes the split along with its routines and their exercises', async () => {
    const ppl = await createSplit(db, 'PPL')
    const ul = await createSplit(db, 'Upper / Lower')
    const push = await createRoutine(db, 'Push', ppl)
    await createRoutine(db, 'Pull', ppl)
    await createRoutine(db, 'Upper A', ul)
    const item = await addExerciseToRoutine(db, push, 'supino')

    // Returns how many routines went along.
    expect(await deleteSplit(db, ppl)).toBe(2)

    // The split and its routines left the lists...
    expect((await listSplits(db)).map((split) => split.name)).toEqual(['Upper / Lower'])
    expect(
      (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name),
    ).toEqual(['Upper A'])
    expect((await db.routineExercises.get(item.id))?.deletedAt).toBeTypeOf('number')
    // ...but nothing was really erased (soft delete): the deletion can be synced.
    expect(await db.routines.count()).toBe(3)
  })

  it('workouts already done stay in the history', async () => {
    const ppl = await createSplit(db, 'PPL')
    const push = await createRoutine(db, 'Push', ppl)
    const workout = await startWorkout(db, push)
    const [first] = await listWorkoutSets(db, workout.id)
    expect(first).toBeUndefined() // empty routine: no sets
    await db.exercises.add({
      id: 'e1',
      names: { pt: 'X', en: 'X' },
      muscleGroup: 'chest',
      equipment: 'barbell',
      isCustom: true,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    })
    const set = await addExerciseToWorkout(db, workout.id, 'e1')
    await toggleSetCompleted(db, set.id)
    await finishWorkout(db, workout.id)

    await deleteSplit(db, ppl)

    const history = await listWorkoutSummaries(db)
    expect(history).toHaveLength(1)
    // The deleted routine's name still shows in the old workout.
    expect(history[0].routineName).toBe('Push')
    expect(history[0].sets).toHaveLength(1)
  })
})

describe('routines inside splits', () => {
  it('the sequence of each split is independent', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const ppl = await createSplit(db, 'PPL')
    const upper = await createRoutine(db, 'Upper', ul)
    const push = await createRoutine(db, 'Push', ppl)
    const lower = await createRoutine(db, 'Lower', ul)
    const pull = await createRoutine(db, 'Pull', ppl)

    // Moving "Lower" up to 1st swaps with "Upper", and NEVER with "Push" (another split).
    await saveRoutine(db, lower, { ...(await draftOf(lower)), position: 0 })

    const all = await listRoutinesWithExercises(db)
    const names = (splitId: string) =>
      all
        .filter((entry) => entry.routine.splitId === splitId)
        .map((entry) => entry.routine.name)
    expect(names(ul)).toEqual(['Lower', 'Upper'])
    expect(names(ppl)).toEqual(['Push', 'Pull'])
    expect([upper, push, pull].length).toBe(3)
  })

  it('moving a routine to another split puts it at the end of the new split', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const ppl = await createSplit(db, 'PPL')
    await createRoutine(db, 'Push', ppl)
    const upper = await createRoutine(db, 'Upper', ul)

    await moveRoutineToSplit(db, upper, ppl)

    const all = await listRoutinesWithExercises(db)
    const inPpl = all.filter((entry) => entry.routine.splitId === ppl)
    expect(inPpl.map((entry) => entry.routine.name)).toEqual(['Push', 'Upper'])
    // Now "Upper / Lower" is empty and can be deleted.
    expect(await deleteSplit(db, ul)).toBe(0)
  })
})

describe('pure split rules', () => {
  const split = (id: string, order: number): Split => ({
    id,
    name: id,
    order,
    notes: '',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  })
  const splits = [split('ul', 0), split('ppl', 1)]

  it('resolveActiveSplit uses the saved one; if it is gone or there is none, the first', () => {
    expect(resolveActiveSplit(splits, 'ppl')?.id).toBe('ppl')
    expect(resolveActiveSplit(splits, 'excluida')?.id).toBe('ul')
    expect(resolveActiveSplit(splits, null)?.id).toBe('ul')
    expect(resolveActiveSplit([], 'ppl')).toBeNull()
  })

  it('routinesOfSplit separates by split and sends orphaned ones to the first', () => {
    const entries = [
      { routine: { splitId: 'ul' }, name: 'Upper' },
      { routine: { splitId: 'ppl' }, name: 'Push' },
      { routine: { splitId: 'apagada' }, name: 'Órfã' },
    ]

    expect(routinesOfSplit(entries, splits, splits[0]).map((e) => e.name)).toEqual([
      'Upper',
      'Órfã',
    ])
    expect(routinesOfSplit(entries, splits, splits[1]).map((e) => e.name)).toEqual([
      'Push',
    ])
  })

  it('lastRoutineIdInSplit looks only at the workouts of that split', () => {
    // Most recent first: Push (PPL), then Lower A (Upper/Lower).
    const finished = [
      { routineId: 'push' },
      { routineId: 'lower-a' },
      { routineId: null },
    ]

    expect(lastRoutineIdInSplit(finished, ['upper-a', 'lower-a'])).toBe('lower-a')
    expect(lastRoutineIdInSplit(finished, ['push', 'pull'])).toBe('push')
    expect(lastRoutineIdInSplit(finished, ['x'])).toBeNull()
  })
})
