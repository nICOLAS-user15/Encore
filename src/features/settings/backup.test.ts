import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, SCHEMA_VERSION, type EncoreDB } from '../../db/db'
import { createRecord, softDelete } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { importTestProgram } from '../../test/fixtures'
import {
  startWorkout,
  toggleSetCompleted,
  finishWorkout,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'
import {
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
} from './backup'

const databases: EncoreDB[] = []
function newDatabase() {
  const db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  databases.push(db)
  return db
}

let phone: EncoreDB

beforeEach(async () => {
  phone = newDatabase()
  await syncSeedExercises(phone)
})

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})

/** Creates a real history: program + one finished workout. */
async function trainOnce(db: EncoreDB) {
  await importTestProgram(db)
  const [routine] = await db.routines.orderBy('order').toArray()
  const workout = await startWorkout(db, routine.id)
  const [first] = await listWorkoutSets(db, workout.id)
  await toggleSetCompleted(db, first.id)
  await finishWorkout(db, workout.id)
  return workout.id
}

describe('backup', () => {
  it('exports and imports: an empty device ends up identical to the original', async () => {
    const workoutId = await trainOnce(phone)
    const text = JSON.stringify(await exportBackup(phone))

    const newPhone = newDatabase()
    const result = await importBackup(newPhone, parseBackup(text))

    expect(result.added).toBeGreaterThan(0)
    for (const table of phone.tables) {
      const original = await table.toArray()
      const copy = await newPhone.table(table.name).toArray()
      expect(copy).toEqual(original)
    }
    expect((await newPhone.workouts.get(workoutId))?.endedAt).toBeTypeOf('number')
  })

  it('importing again duplicates nothing', async () => {
    await trainOnce(phone)
    const backup = await exportBackup(phone)

    const result = await importBackup(phone, backup)

    expect(result).toMatchObject({ added: 0, updated: 0 })
  })

  it('keeps the most recent version of each record (including deletions)', async () => {
    const exercise = await createRecord(phone.exercises, {
      names: { pt: 'Meu exercício', en: 'My exercise' },
      muscleGroup: 'core',
      equipment: 'machine',
      isCustom: true,
    })
    const oldBackup = await exportBackup(phone)

    // After the backup, the exercise was deleted on this device (more recent).
    await new Promise((resolve) => setTimeout(resolve, 2))
    await softDelete(phone.exercises, exercise.id)

    await importBackup(phone, oldBackup)

    // The old backup does not "resurrect" the exercise.
    expect((await phone.exercises.get(exercise.id))?.deletedAt).toBeTypeOf('number')

    // And the reverse path: the deletion reaches a device that had the old version.
    const otherPhone = newDatabase()
    await importBackup(otherPhone, oldBackup)
    await importBackup(otherPhone, await exportBackup(phone))
    expect((await otherPhone.exercises.get(exercise.id))?.deletedAt).toBeTypeOf('number')
  })

  it('rejects files that are not Encore backups', () => {
    expect(() => parseBackup('não é json')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"outra-coisa"}')).toThrow(BackupError)
    expect(() =>
      parseBackup(
        JSON.stringify({
          format: 'encore-backup',
          schemaVersion: SCHEMA_VERSION,
          tables: {},
        }),
      ),
    ).toThrow(BackupError)
  })

  it('rejects a backup from a newer app version', async () => {
    const backup = await exportBackup(phone)
    const future = JSON.stringify({ ...backup, schemaVersion: SCHEMA_VERSION + 1 })

    try {
      parseBackup(future)
      expect.unreachable()
    } catch (error) {
      expect((error as BackupError).reason).toBe('newerVersion')
    }
  })

  it('file name includes the date', () => {
    expect(backupFileName(new Date(2026, 10, 18))).toBe('encore-backup-2026-11-18.json')
  })
})

describe('backup from an earlier version (v2, before splits)', () => {
  /** A file as the old app exported it: no `splits` table and no `splitId`. */
  async function oldBackupFile() {
    await importTestProgram(phone)
    const backup = await exportBackup(phone)
    const old = JSON.parse(JSON.stringify(backup))
    old.schemaVersion = 2
    delete old.tables.splits
    for (const routine of old.tables.routines) {
      delete routine.splitId
    }
    return JSON.stringify(old)
  }

  it('is accepted and the routines go to an "Upper / Lower" split"', async () => {
    const file = await oldBackupFile()
    const newPhone = newDatabase()

    const backup = parseBackup(file)
    await importBackup(newPhone, backup)

    const splits = await newPhone.splits.toArray()
    expect(splits.map((split) => split.name)).toEqual(['Upper / Lower'])
    const routines = await newPhone.routines.toArray()
    expect(routines).toHaveLength(4)
    expect(routines.every((routine) => routine.splitId === splits[0].id)).toBe(true)
  })

  it('importing twice, or on a device that already migrated, does not create a duplicate split', async () => {
    // This device already has the routines in the program's split, with the migration id.
    const file = await oldBackupFile()
    const migrated = newDatabase()
    await importBackup(migrated, parseBackup(file))

    await importBackup(migrated, parseBackup(file))

    expect(await migrated.splits.count()).toBe(1)
    expect(await migrated.routines.count()).toBe(4)
  })

  it('does not undo a split renamed after the migration', async () => {
    const file = await oldBackupFile()
    const migrated = newDatabase()
    await importBackup(migrated, parseBackup(file))
    const [split] = await migrated.splits.toArray()
    // The user renamed it later (updatedAt newer than the old file's).
    await migrated.splits.update(split.id, {
      name: 'Meu ABC',
      updatedAt: Date.now() + 1000,
    })

    await importBackup(migrated, parseBackup(file))

    expect((await migrated.splits.get(split.id))?.name).toBe('Meu ABC')
  })

  it('a version 1 file, from before backups existed, is still rejected', () => {
    const v1 = JSON.stringify({ format: 'encore-backup', schemaVersion: 1, tables: {} })
    expect(() => parseBackup(v1)).toThrow(BackupError)
  })
})

describe('backup: malformed files', () => {
  /** Valid backup from a device with the program and one workout, already as an object. */
  async function validBackup() {
    await trainOnce(phone)
    return JSON.parse(JSON.stringify(await exportBackup(phone))) as ReturnType<
      typeof parseBackup
    >
  }

  it('rejects an exercise without names (it would freeze the screens on every open)', async () => {
    const backup = await validBackup()
    delete (backup.tables.exercises[0] as unknown as { names?: unknown }).names

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
  })

  it('rejects an unknown language in settings and a record without deletedAt', async () => {
    const backup = await validBackup()
    backup.tables.settings = [
      {
        id: 'app-settings',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        language: 'xx',
      } as never,
    ]
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)

    const other = await validBackup()
    delete (other.tables.routines[0] as unknown as { deletedAt?: unknown }).deletedAt
    expect(() => parseBackup(JSON.stringify(other))).toThrow(BackupError)
  })

  it('drops unknown fields and accepts settings from an old version', async () => {
    const backup = await validBackup()
    ;(backup.tables.routines[0] as unknown as Record<string, unknown>).lixo = 'x'
    backup.tables.settings = [
      {
        id: 'app-settings',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        restSeconds: 120,
      } as never,
    ]

    const parsed = parseBackup(JSON.stringify(backup))

    expect(parsed.tables.routines[0]).not.toHaveProperty('lixo')
    expect(parsed.tables.settings[0]).toMatchObject({ restSeconds: 120 })
  })
})

describe('backup: no duplicates and no ghost workouts', () => {
  it('an exercise with the same name as one the device already has uses the device one', async () => {
    // Old device: exercise created before the library (random id, same name).
    const old = newDatabase()
    const created = await createRecord(old.exercises, {
      names: { pt: 'Abdominal na máquina', en: 'Abs Machine' },
      muscleGroup: 'core',
      equipment: 'machine',
      isCustom: true,
    })
    const split = await createRecord(old.splits, { name: 'S', notes: '', order: 0 })
    const routine = await createRecord(old.routines, {
      name: 'R',
      splitId: split.id,
      notes: '',
      order: 0,
    })
    await createRecord(old.routineExercises, {
      routineId: routine.id,
      exerciseId: created.id,
      position: 0,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      referenceWeightKg: null,
      referenceReps: null,
      notes: '',
      restSeconds: null,
    })
    const text = JSON.stringify(await exportBackup(old))

    // New device: the seed already created "Abs Machine" with a fixed id.
    const before = await phone.exercises.count()
    await importBackup(phone, parseBackup(text))

    expect(await phone.exercises.count()).toBe(before) // no repeated exercise
    const [item] = await phone.routineExercises.toArray()
    const linked = await phone.exercises.get(item.exerciseId)
    expect(linked?.names.en).toBe('Abs Machine')
    expect(linked?.id).not.toBe(created.id)
  })

  it('a workout in progress from the file comes in finished if the device already has one open', async () => {
    await importTestProgram(phone)
    const [routine] = await phone.routines.orderBy('order').toArray()
    await startWorkout(phone, routine.id) // open here

    const other = newDatabase()
    await importTestProgram(other)
    const [otherRoutine] = await other.routines.orderBy('order').toArray()
    const open = await startWorkout(other, otherRoutine.id) // open there too
    const text = JSON.stringify(await exportBackup(other))

    await importBackup(phone, parseBackup(text))

    const imported = await phone.workouts.get(open.id)
    expect(imported?.endedAt).not.toBeNull() // went to history
    const stillOpen = (await phone.workouts.toArray()).filter(
      (workout) => workout.endedAt === null && workout.deletedAt === null,
    )
    expect(stillOpen).toHaveLength(1)
  })
})
