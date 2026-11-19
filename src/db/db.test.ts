import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase, SCHEMA_VERSION, type EncoreDB } from './db'
import { listActiveExercises } from './queries'
import {
  createRecord,
  isActive,
  restoreRecord,
  softDelete,
  updateRecord,
} from './repository'
import { SEED_EXERCISES, syncSeedExercises } from './seed'
import { MUSCLE_GROUPS, type Exercise, type SetEntry } from './types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const benchPress = {
  names: { pt: 'Supino teste', en: 'Test bench' },
  muscleGroup: 'chest',
  equipment: 'barbell',
  isCustom: true,
} as const

let db: EncoreDB

beforeEach(() => {
  // Fresh database with a unique name in each test: no test affects another.
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

describe('createRecord', () => {
  it('generates a UUID and fills in the dates automatically', async () => {
    const exercise = await createRecord(db.exercises, benchPress)

    expect(exercise.id).toMatch(UUID_PATTERN)
    expect(exercise.createdAt).toBeTypeOf('number')
    expect(exercise.updatedAt).toBe(exercise.createdAt)
    expect(exercise.deletedAt).toBeNull()
    expect(await db.exercises.get(exercise.id)).toEqual(exercise)
  })

  it('generates a different id for each record', async () => {
    const a = await createRecord(db.exercises, benchPress)
    const b = await createRecord(db.exercises, benchPress)

    expect(a.id).not.toBe(b.id)
  })
})

describe('updateRecord', () => {
  it('changes the fields and renews updatedAt, without touching createdAt', async () => {
    // Only Date is "fake" here; real timers keep running (IndexedDB needs them).
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    const exercise = await createRecord(db.exercises, benchPress)

    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'))
    await updateRecord(db.exercises, exercise.id, {
      names: { pt: 'Supino renomeado', en: 'Renamed bench' },
    })

    const updated = await db.exercises.get(exercise.id)
    expect(updated?.names.pt).toBe('Supino renomeado')
    expect(updated?.createdAt).toBe(exercise.createdAt)
    expect(updated?.updatedAt).toBeGreaterThan(exercise.updatedAt)
  })
})

describe('softDelete (soft delete)', () => {
  it('sets deletedAt and keeps the row in the database', async () => {
    const exercise = await createRecord(db.exercises, benchPress)

    await softDelete(db.exercises, exercise.id)

    const stored = await db.exercises.get(exercise.id)
    expect(stored).toBeDefined()
    expect(stored?.deletedAt).toBeTypeOf('number')
    expect(stored?.updatedAt).toBe(stored?.deletedAt)
    expect(isActive(stored as Exercise)).toBe(false)
  })

  it('removes the record from listings', async () => {
    const kept = await createRecord(db.exercises, benchPress)
    const removed = await createRecord(db.exercises, {
      ...benchPress,
      names: { pt: 'Removido', en: 'Removed' },
    })

    await softDelete(db.exercises, removed.id)

    const list = await listActiveExercises(db)
    expect(list.map((exercise) => exercise.id)).toEqual([kept.id])
  })

  it('fails with a clear message if the id does not exist', async () => {
    await expect(softDelete(db.exercises, 'nao-existe')).rejects.toThrow(
      'Record nao-existe not found',
    )
  })
})

describe('syncSeedExercises', () => {
  it('inserts the initial exercises when the database is empty', async () => {
    const inserted = await syncSeedExercises(db)

    expect(inserted).toBe(SEED_EXERCISES.length)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('running again inserts nothing (everything already exists)', async () => {
    await syncSeedExercises(db)

    expect(await syncSeedExercises(db)).toBe(0)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('on a database already in use, adds only the new exercises', async () => {
    // Simulates a device with the old version: only the first 25 exercises.
    const now = Date.now()
    await db.exercises.bulkAdd(
      SEED_EXERCISES.slice(0, 25).map((seed) => ({
        ...seed,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
    )

    expect(await syncSeedExercises(db)).toBe(SEED_EXERCISES.length - 25)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('does not duplicate an exercise that already exists with the same name (e.g. from the program)', async () => {
    // Created by the program import, with another id, same name (and different accent/case).
    await createRecord(db.exercises, {
      names: { pt: 'remada CAVALINHO', en: 'T-Bar Row' },
      muscleGroup: 'back',
      equipment: 'barbell',
      isCustom: true,
    })

    await syncSeedExercises(db)

    const tBarRows = (await db.exercises.toArray()).filter(
      (exercise) => exercise.names.en === 'T-Bar Row',
    )
    expect(tBarRows).toHaveLength(1)
  })

  it('does not duplicate when called twice at the same time', async () => {
    await Promise.all([syncSeedExercises(db), syncSeedExercises(db)])

    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('does not "resurrect" seed exercises the user deleted', async () => {
    await syncSeedExercises(db)
    const all = await db.exercises.toArray()
    for (const exercise of all) {
      await softDelete(db.exercises, exercise.id)
    }

    expect(await syncSeedExercises(db)).toBe(0)
    expect(await listActiveExercises(db)).toEqual([])
  })

  it('covers all muscle groups, with no repeated ids or names', () => {
    const groups = new Set(SEED_EXERCISES.map((exercise) => exercise.muscleGroup))
    const ids = new Set(SEED_EXERCISES.map((exercise) => exercise.id))
    const namesPt = new Set(SEED_EXERCISES.map((exercise) => exercise.names.pt))
    const namesEn = new Set(SEED_EXERCISES.map((exercise) => exercise.names.en))

    expect([...groups].sort()).toEqual([...MUSCLE_GROUPS].sort())
    expect(ids.size).toBe(SEED_EXERCISES.length)
    expect(namesPt.size).toBe(SEED_EXERCISES.length)
    expect(namesEn.size).toBe(SEED_EXERCISES.length)
    for (const id of ids) {
      expect(id).toMatch(UUID_PATTERN)
    }
  })
})

describe('indexes', () => {
  it('[exerciseId+completedAt] returns the exercise history in order and ignores uncompleted sets', async () => {
    const exerciseId = crypto.randomUUID()
    const workoutId = crypto.randomUUID()
    const set = (position: number, completedAt: number | null) =>
      createRecord<SetEntry>(db.setEntries, {
        workoutId,
        exerciseId,
        position,
        weightKg: 100,
        reps: 5,
        type: 'normal',
        completedAt,
      })

    await set(0, 3000)
    await set(1, 1000)
    await set(2, null) // not completed yet

    const history = await db.setEntries
      .where('[exerciseId+completedAt]')
      .between([exerciseId, 0], [exerciseId, Infinity])
      .toArray()

    expect(history.map((entry) => entry.completedAt)).toEqual([1000, 3000])
  })
})

describe('schema version', () => {
  it('SCHEMA_VERSION follows the highest db.version(...) (the backup records this number)', async () => {
    await db.open()
    // Dexie stores the IndexedDB version multiplied by 10.
    expect(db.verno).toBe(SCHEMA_VERSION)
  })
})

describe('repository: atomic writes and undo', () => {
  it('two updates in a row on the same record lose neither', async () => {
    const created = await createRecord(db.exercises, { ...benchPress })

    await Promise.all([
      updateRecord(db.exercises, created.id, { equipment: 'machine' }),
      updateRecord(db.exercises, created.id, { muscleGroup: 'back' }),
    ])

    const saved = await db.exercises.get(created.id)
    expect(saved).toMatchObject({ equipment: 'machine', muscleGroup: 'back' })
  })

  it('restoreRecord undoes the softDelete', async () => {
    const created = await createRecord(db.exercises, { ...benchPress })
    await softDelete(db.exercises, created.id)
    expect((await db.exercises.get(created.id))?.deletedAt).toBeTypeOf('number')

    await restoreRecord(db.exercises, created.id)

    expect((await db.exercises.get(created.id))?.deletedAt).toBeNull()
  })
})
