import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase, SCHEMA_VERSION, type EncoreDB } from '../../db/db'
import { createRecord, softDelete } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { importTestProgram } from '../../test/fixtures'
import {
  startWorkout,
  setExerciseNote,
  toggleSetCompleted,
  finishWorkout,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'
import { logBodyWeight } from '../bodyweight/bodyWeightActions'
import {
  BackupError,
  type Backup,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  saveBackupFile,
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

  it('a routine deleted before splits existed (no splitId) does not make the backup unrestorable', async () => {
    await trainOnce(phone)
    // What migration v3 leaves when every routine was already deleted: no splitId.
    await phone.routines.add({
      id: 'old-routine',
      name: 'Old',
      order: 9,
      notes: '',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: 2,
    } as never)

    const backup = parseBackup(JSON.stringify(await exportBackup(phone)))
    const newPhone = newDatabase()
    await importBackup(newPhone, backup)

    expect((await newPhone.routines.get('old-routine'))?.deletedAt).toBe(2)
  })
})

describe('saving the backup file', () => {
  const backup = {
    format: 'encore-backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: 0,
    tables: {},
  } as Backup

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubShare(share: () => Promise<void>) {
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share })
    // jsdom has no object URLs: the download fallback only needs them to exist.
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  }

  it('a confirmed share is a saved backup', async () => {
    stubShare(() => Promise.resolve())
    expect(await saveBackupFile(backup)).toBe('saved')
  })

  it('closing the share sheet is not a backup', async () => {
    stubShare(() => Promise.reject(new DOMException('closed', 'AbortError')))
    expect(await saveBackupFile(backup)).toBe('cancelled')
  })

  it('a failed share falls back to a download that cannot be confirmed', async () => {
    stubShare(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    expect(await saveBackupFile(backup)).toBe('unconfirmed')
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

describe('backup from an earlier version (v3, before body weight)', () => {
  it('is accepted, with no body weights', async () => {
    await trainOnce(phone)
    const old = JSON.parse(JSON.stringify(await exportBackup(phone)))
    old.schemaVersion = 3
    delete old.tables.bodyWeights

    const backup = parseBackup(JSON.stringify(old))
    const newPhone = newDatabase()
    await importBackup(newPhone, backup)

    expect(backup.tables.bodyWeights).toEqual([])
    expect(await newPhone.workouts.count()).toBe(1)
  })

  it('a v2 file goes through both conversions', async () => {
    await importTestProgram(phone)
    const old = JSON.parse(JSON.stringify(await exportBackup(phone)))
    old.schemaVersion = 2
    delete old.tables.splits
    delete old.tables.bodyWeights
    for (const routine of old.tables.routines) {
      delete routine.splitId
    }

    const backup = parseBackup(JSON.stringify(old))

    expect(backup.tables.splits).toHaveLength(1)
    expect(backup.tables.bodyWeights).toEqual([])
  })
})

describe('backup: body weight', () => {
  it('goes to the other device with the rest', async () => {
    await logBodyWeight(phone, 82.4, 1_000)

    const newPhone = newDatabase()
    await importBackup(newPhone, parseBackup(JSON.stringify(await exportBackup(phone))))

    expect(await newPhone.bodyWeights.toArray()).toEqual(
      await phone.bodyWeights.toArray(),
    )
  })

  it('rejects an impossible body weight', async () => {
    await logBodyWeight(phone, 82.4, 1_000)
    const backup = JSON.parse(JSON.stringify(await exportBackup(phone)))
    backup.tables.bodyWeights[0].weightKg = 0

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
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

  it('keeps a valid weekly goal and rejects one outside 1 to 7', async () => {
    const settingsWith = (weeklyGoal: unknown) =>
      [
        { id: 'app-settings', createdAt: 1, updatedAt: 1, deletedAt: null, weeklyGoal },
      ] as never

    const backup = await validBackup()
    backup.tables.settings = settingsWith(4)
    expect(parseBackup(JSON.stringify(backup)).tables.settings[0]).toMatchObject({
      weeklyGoal: 4,
    })

    // null = automatic
    backup.tables.settings = settingsWith(null)
    expect(parseBackup(JSON.stringify(backup)).tables.settings[0]).toMatchObject({
      weeklyGoal: null,
    })

    for (const invalid of [0, 8, 2.5, 'três']) {
      backup.tables.settings = settingsWith(invalid)
      expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
    }
  })
})

describe('backup: bar and plates', () => {
  const settingsWith = (fields: Record<string, unknown>) =>
    [
      { id: 'app-settings', createdAt: 1, updatedAt: 1, deletedAt: null, ...fields },
    ] as never

  it('keeps a valid bar and plates and rejects broken ones', async () => {
    await trainOnce(phone)
    const backup = JSON.parse(JSON.stringify(await exportBackup(phone)))

    backup.tables.settings = settingsWith({ barWeightKg: 15, platesKg: [20, 10, 1.25] })
    expect(parseBackup(JSON.stringify(backup)).tables.settings[0]).toMatchObject({
      barWeightKg: 15,
      platesKg: [20, 10, 1.25],
    })

    for (const invalid of [
      { barWeightKg: 0 },
      { platesKg: 20 },
      { platesKg: [10, -5] },
    ]) {
      backup.tables.settings = settingsWith(invalid)
      expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
    }
  })
})

describe('backup: exercise notes', () => {
  it('go to the other device with their workout', async () => {
    const workoutId = await trainOnce(phone)
    await setExerciseNote(phone, workoutId, 'exercise-1', 'pegada fechada')

    const newPhone = newDatabase()
    await importBackup(newPhone, parseBackup(JSON.stringify(await exportBackup(phone))))

    expect((await newPhone.workouts.get(workoutId))?.exerciseNotes).toEqual({
      'exercise-1': 'pegada fechada',
    })
  })

  it('a workout from before notes stays without them; empty notes are dropped', async () => {
    await trainOnce(phone)
    const backup = JSON.parse(JSON.stringify(await exportBackup(phone)))
    expect(parseBackup(JSON.stringify(backup)).tables.workouts[0]).not.toHaveProperty(
      'exerciseNotes',
    )

    backup.tables.workouts[0].exerciseNotes = { a: '  banco 4 ', b: '  ' }
    expect(parseBackup(JSON.stringify(backup)).tables.workouts[0]).toMatchObject({
      exerciseNotes: { a: 'banco 4' },
    })
  })

  it('rejects notes that are not text', async () => {
    await trainOnce(phone)
    const backup = JSON.parse(JSON.stringify(await exportBackup(phone)))

    for (const invalid of ['nota', ['nota'], { a: 3 }, { a: null }]) {
      backup.tables.workouts[0].exerciseNotes = invalid
      expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
    }
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
