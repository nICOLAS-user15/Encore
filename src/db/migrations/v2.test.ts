import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { getLastPerformance } from '../../features/workout/workoutQueries'
import { createDatabase, SCHEMA_V1 } from '../db'

const SEED_BENCH = 'd583a392-b227-4970-a6ff-07c929916fd3' // "Supino reto com barra" in the seed
const base = { createdAt: 1, updatedAt: 1, deletedAt: null }

/** Creates a database in the OLD format (version 1), like the one on your phone. */
async function createLegacyDatabase(name: string) {
  const legacy = new Dexie(name)
  legacy.version(1).stores(SCHEMA_V1)
  await legacy.open()

  await legacy.table('exercises').bulkAdd([
    // From the seed (name only in Portuguese)
    {
      id: SEED_BENCH,
      name: 'Supino reto com barra',
      muscleGroup: 'chest',
      equipment: 'barbell',
      isCustom: false,
      ...base,
    },
    // Created by the Upper/Lower program (name in English). The first is a duplicate of the seed.
    {
      id: 'program-bench',
      name: 'Bench Press',
      muscleGroup: 'chest',
      equipment: 'barbell',
      isCustom: true,
      ...base,
    },
    {
      id: 'program-tbar',
      name: 'T-Bar Row',
      muscleGroup: 'back',
      equipment: 'barbell',
      isCustom: true,
      ...base,
    },
    // A name the migration does not know
    {
      id: 'mine',
      name: 'Meu exercício',
      muscleGroup: 'core',
      equipment: 'machine',
      isCustom: true,
      ...base,
    },
  ])
  await legacy.table('routineExercises').add({
    id: 're1',
    routineId: 'r1',
    exerciseId: 'program-bench',
    position: 0,
    targetSets: 3,
    targetRepsMin: 6,
    targetRepsMax: 10,
    referenceWeightKg: 25,
    referenceReps: 8,
    notes: '',
    ...base,
  })
  await legacy.table('workouts').add({
    id: 'w1',
    routineId: 'r1',
    startedAt: 1000,
    endedAt: 5000,
    notes: '',
    ...base,
  })
  await legacy.table('setEntries').add({
    id: 's1',
    workoutId: 'w1',
    exerciseId: 'program-bench',
    position: 0,
    weightKg: 30,
    reps: 8,
    type: 'normal',
    completedAt: 2000,
    ...base,
  })

  legacy.close()
}

describe('migration v1 -> v2', () => {
  it('translates names, merges duplicates without losing sets and fills in the timer', async () => {
    const name = `encore-migration-${crypto.randomUUID()}`
    await createLegacyDatabase(name)

    // Opening with the new code triggers the migration.
    const db = createDatabase(name)
    await db.open()

    // Names in both languages; the old `name` field goes away.
    const bench = await db.exercises.get(SEED_BENCH)
    expect(bench?.names).toEqual({ pt: 'Supino reto com barra', en: 'Bench Press' })
    expect(bench && 'name' in bench).toBe(false)
    expect((await db.exercises.get('program-tbar'))?.names).toEqual({
      pt: 'Remada cavalinho',
      en: 'T-Bar Row',
    })
    expect((await db.exercises.get('mine'))?.names).toEqual({
      pt: 'Meu exercício',
      en: 'Meu exercício',
    })

    // The duplicate was deleted (soft) and everything that pointed to it went to the seed.
    expect((await db.exercises.get('program-bench'))?.deletedAt).toBeTypeOf('number')
    expect((await db.routineExercises.get('re1'))?.exerciseId).toBe(SEED_BENCH)
    expect((await db.setEntries.get('s1'))?.exerciseId).toBe(SEED_BENCH)

    // The unified exercise history finds the old set (updated index).
    const last = await getLastPerformance(db, SEED_BENCH)
    expect(last?.sets.map((set) => set.id)).toEqual(['s1'])

    // Timer: old workouts use the start and end they already had.
    expect(await db.workouts.get('w1')).toMatchObject({
      timerStartedAt: 1000,
      timerStoppedAt: 5000,
    })

    // The new table exists.
    expect(await db.settings.count()).toBe(0)

    await db.delete()
  })
})
