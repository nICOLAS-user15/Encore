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

/** Cria um histórico de verdade: programa + um treino finalizado. */
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
  it('exporta e importa: um aparelho vazio fica igual ao original', async () => {
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

  it('importar de novo não duplica nada', async () => {
    await trainOnce(phone)
    const backup = await exportBackup(phone)

    const result = await importBackup(phone, backup)

    expect(result).toMatchObject({ added: 0, updated: 0 })
  })

  it('mantém a versão mais recente de cada registro (inclusive exclusões)', async () => {
    const exercise = await createRecord(phone.exercises, {
      names: { pt: 'Meu exercício', en: 'My exercise' },
      muscleGroup: 'core',
      equipment: 'machine',
      isCustom: true,
    })
    const oldBackup = await exportBackup(phone)

    // Depois do backup, o exercício foi excluído neste aparelho (mais recente).
    await new Promise((resolve) => setTimeout(resolve, 2))
    await softDelete(phone.exercises, exercise.id)

    await importBackup(phone, oldBackup)

    // O backup antigo não "ressuscita" o exercício.
    expect((await phone.exercises.get(exercise.id))?.deletedAt).toBeTypeOf('number')

    // E o caminho inverso: a exclusão chega num aparelho que tinha a versão antiga.
    const otherPhone = newDatabase()
    await importBackup(otherPhone, oldBackup)
    await importBackup(otherPhone, await exportBackup(phone))
    expect((await otherPhone.exercises.get(exercise.id))?.deletedAt).toBeTypeOf('number')
  })

  it('recusa arquivos que não são backup do Encore', () => {
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

  it('recusa backup de uma versão mais nova do app', async () => {
    const backup = await exportBackup(phone)
    const future = JSON.stringify({ ...backup, schemaVersion: SCHEMA_VERSION + 1 })

    try {
      parseBackup(future)
      expect.unreachable()
    } catch (error) {
      expect((error as BackupError).reason).toBe('newerVersion')
    }
  })

  it('nome do arquivo leva a data', () => {
    expect(backupFileName(new Date(2026, 10, 18))).toBe('encore-backup-2026-11-18.json')
  })
})

describe('backup de uma versão anterior (v2, antes das divisões)', () => {
  /** Um arquivo como o app antigo exportava: sem tabela `splits` e sem `splitId`. */
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

  it('é aceito e as rotinas vão para uma divisão "Upper / Lower"', async () => {
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

  it('importar duas vezes, ou num aparelho que já migrou, não cria divisão repetida', async () => {
    // Este aparelho já tem as rotinas na divisão do programa, com o id da migração.
    const file = await oldBackupFile()
    const migrated = newDatabase()
    await importBackup(migrated, parseBackup(file))

    await importBackup(migrated, parseBackup(file))

    expect(await migrated.splits.count()).toBe(1)
    expect(await migrated.routines.count()).toBe(4)
  })

  it('não desfaz uma divisão renomeada depois da migração', async () => {
    const file = await oldBackupFile()
    const migrated = newDatabase()
    await importBackup(migrated, parseBackup(file))
    const [split] = await migrated.splits.toArray()
    // O usuário renomeou depois (updatedAt mais novo que o do arquivo antigo).
    await migrated.splits.update(split.id, {
      name: 'Meu ABC',
      updatedAt: Date.now() + 1000,
    })

    await importBackup(migrated, parseBackup(file))

    expect((await migrated.splits.get(split.id))?.name).toBe('Meu ABC')
  })

  it('arquivo da versão 1, anterior ao backup, continua sendo recusado', () => {
    const v1 = JSON.stringify({ format: 'encore-backup', schemaVersion: 1, tables: {} })
    expect(() => parseBackup(v1)).toThrow(BackupError)
  })
})

describe('backup: arquivos malformados', () => {
  /** Backup válido de um aparelho com o programa e um treino, já em objeto. */
  async function validBackup() {
    await trainOnce(phone)
    return JSON.parse(JSON.stringify(await exportBackup(phone))) as ReturnType<
      typeof parseBackup
    >
  }

  it('recusa exercício sem nomes (travaria as telas a cada abertura)', async () => {
    const backup = await validBackup()
    delete (backup.tables.exercises[0] as unknown as { names?: unknown }).names

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError)
  })

  it('recusa idioma desconhecido nas configurações e registro sem deletedAt', async () => {
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

  it('descarta campos desconhecidos e aceita configurações de versão antiga', async () => {
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

describe('backup: sem duplicar nem deixar treino fantasma', () => {
  it('exercício com o mesmo nome de um que o aparelho já tem usa o do aparelho', async () => {
    // Aparelho antigo: exercício criado antes da biblioteca (id aleatório, mesmo nome).
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

    // Aparelho novo: o seed já criou "Abs Machine" com id fixo.
    const before = await phone.exercises.count()
    await importBackup(phone, parseBackup(text))

    expect(await phone.exercises.count()).toBe(before) // nada de exercício repetido
    const [item] = await phone.routineExercises.toArray()
    const linked = await phone.exercises.get(item.exerciseId)
    expect(linked?.names.en).toBe('Abs Machine')
    expect(linked?.id).not.toBe(created.id)
  })

  it('treino em andamento do arquivo entra finalizado se o aparelho já tem um aberto', async () => {
    await importTestProgram(phone)
    const [routine] = await phone.routines.orderBy('order').toArray()
    await startWorkout(phone, routine.id) // aberto aqui

    const other = newDatabase()
    await importTestProgram(other)
    const [otherRoutine] = await other.routines.orderBy('order').toArray()
    const open = await startWorkout(other, otherRoutine.id) // aberto lá também
    const text = JSON.stringify(await exportBackup(other))

    await importBackup(phone, parseBackup(text))

    const imported = await phone.workouts.get(open.id)
    expect(imported?.endedAt).not.toBeNull() // foi para o histórico
    const stillOpen = (await phone.workouts.toArray()).filter(
      (workout) => workout.endedAt === null && workout.deletedAt === null,
    )
    expect(stillOpen).toHaveLength(1)
  })
})
