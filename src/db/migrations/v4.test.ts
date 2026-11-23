import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { createDatabase, SCHEMA_V1, SCHEMA_VERSION } from '../db'

const base = { createdAt: 1, updatedAt: 1, deletedAt: null }

/**
 * Creates a database in the VERSION 3 format (what is on the phone before this update):
 * splits, a routine, a finished workout with a set, and settings. No bodyWeights table.
 */
async function createV3Database(name: string) {
  const legacy = new Dexie(name)
  legacy.version(1).stores(SCHEMA_V1)
  legacy
    .version(2)
    .stores({ exercises: 'id, muscleGroup, updatedAt', settings: 'id, updatedAt' })
  legacy.version(3).stores({ splits: 'id, order, updatedAt' })
  await legacy.open()

  await legacy
    .table('splits')
    .add({ ...base, id: 's1', name: 'PPL', order: 0, notes: '' })
  await legacy
    .table('routines')
    .add({ ...base, id: 'r1', name: 'Push', splitId: 's1', order: 0, notes: '' })
  await legacy.table('workouts').add({
    ...base,
    id: 'w1',
    routineId: 'r1',
    startedAt: 10,
    endedAt: 20,
    timerStartedAt: null,
    timerStoppedAt: null,
    notes: '',
  })
  await legacy.table('setEntries').add({
    ...base,
    id: 'set1',
    workoutId: 'w1',
    exerciseId: 'e1',
    position: 0,
    weightKg: 100,
    reps: 5,
    type: 'normal',
    completedAt: 15,
  })
  await legacy
    .table('settings')
    .add({ ...base, id: 'app-settings', language: 'pt', restSeconds: 120 })
  legacy.close()
}

describe('migration v3 -> v4 (body weight)', () => {
  it('keeps every existing record and adds an empty, usable bodyWeights table', async () => {
    const name = `encore-migration-${crypto.randomUUID()}`
    await createV3Database(name)

    const db = createDatabase(name)
    await db.open()

    expect(db.verno).toBe(SCHEMA_VERSION)
    expect(await db.splits.get('s1')).toMatchObject({ name: 'PPL' })
    expect(await db.routines.get('r1')).toMatchObject({ name: 'Push', splitId: 's1' })
    expect(await db.workouts.get('w1')).toMatchObject({ endedAt: 20 })
    expect(await db.setEntries.get('set1')).toMatchObject({ weightKg: 100, reps: 5 })
    expect(await db.settings.get('app-settings')).toMatchObject({ restSeconds: 120 })

    expect(await db.bodyWeights.count()).toBe(0)
    await db.bodyWeights.add({ ...base, id: 'bw1', measuredAt: 30, weightKg: 82.4 })
    expect(await db.bodyWeights.orderBy('measuredAt').first()).toMatchObject({
      weightKg: 82.4,
    })

    await db.delete()
  })
})
