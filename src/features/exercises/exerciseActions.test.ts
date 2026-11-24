import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { listActiveExercises } from '../../db/queries'
import { softDelete } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { addExerciseToRoutine, createRoutine } from '../routines/routineActions'
import { createSplit } from '../splits/splitActions'
import {
  createCustomExercise,
  deleteCustomExercise,
  findExerciseByName,
  routinesUsingExercise,
  updateCustomExercise,
} from './exerciseActions'

let db: EncoreDB

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await syncSeedExercises(db)
})

afterEach(async () => {
  await db.delete()
})

describe('createCustomExercise', () => {
  it('creates the exercise in the library, marked as user-made, with the name in both languages', async () => {
    const before = await db.exercises.count()

    const created = await createCustomExercise(db, {
      name: '  Remada  articulada ',
      muscleGroup: 'back',
      equipment: 'machine',
    })

    expect(created).toMatchObject({
      names: { pt: 'Remada articulada', en: 'Remada articulada' },
      muscleGroup: 'back',
      equipment: 'machine',
      isCustom: true,
      deletedAt: null,
    })
    expect(await db.exercises.count()).toBe(before + 1)
    // It shows in the library (the list the Exercícios tab uses), in both languages.
    expect((await listActiveExercises(db, 'pt')).map((e) => e.id)).toContain(created.id)
    expect((await listActiveExercises(db, 'en')).map((e) => e.id)).toContain(created.id)
  })

  it('does not duplicate: a name that already exists returns the existing exercise', async () => {
    const before = await db.exercises.count()

    // Case, accents and language different from the "Supino reto com barra" / "Bench Press" entry.
    const byPortuguese = await createCustomExercise(db, {
      name: 'SUPINO reto com BARRA',
      muscleGroup: 'chest',
      equipment: 'barbell',
    })
    const byEnglish = await createCustomExercise(db, {
      name: 'bench press',
      muscleGroup: 'chest',
      equipment: 'barbell',
    })

    expect(byPortuguese.id).toBe(byEnglish.id)
    expect(byPortuguese.isCustom).toBe(false) // it is the seed one, untouched
    expect(await db.exercises.count()).toBe(before)
  })

  it('creating the same new name twice does not generate a duplicate', async () => {
    const input = {
      name: 'Meu exercício',
      muscleGroup: 'core',
      equipment: 'cable',
    } as const

    const [a, b] = await Promise.all([
      createCustomExercise(db, input),
      createCustomExercise(db, input),
    ])

    expect(a.id).toBe(b.id)
    expect((await db.exercises.filter((e) => e.isCustom).toArray()).length).toBe(1)
  })

  it('an exercise deleted from the library does not count: the name can be created again', async () => {
    const created = await createCustomExercise(db, {
      name: 'Exercício antigo',
      muscleGroup: 'core',
      equipment: 'bodyweight',
    })
    await softDelete(db.exercises, created.id)

    const again = await createCustomExercise(db, {
      name: 'Exercício antigo',
      muscleGroup: 'core',
      equipment: 'bodyweight',
    })

    expect(again.id).not.toBe(created.id)
  })
})

describe('findExerciseByName', () => {
  it('finds by any language, ignoring accents and case', async () => {
    expect((await findExerciseByName(db, 'tríceps NA polia'))?.names.pt).toBe(
      'Tríceps na polia',
    )
    expect((await findExerciseByName(db, 'cable triceps pushdown'))?.names.en).toBe(
      'Cable Triceps Pushdown',
    )
    expect(await findExerciseByName(db, 'não existe esse')).toBeUndefined()
  })
})

describe('editing and deleting a custom exercise', () => {
  async function custom(name = 'Remada articulada') {
    return createCustomExercise(db, { name, muscleGroup: 'back', equipment: 'machine' })
  }

  it('renames (both languages) and changes group and equipment', async () => {
    const exercise = await custom()

    const result = await updateCustomExercise(db, exercise.id, {
      name: ' Remada  sentada   unilateral ',
      muscleGroup: 'shoulders',
      equipment: 'cable',
    })

    expect(result).toBe('saved')
    expect(await db.exercises.get(exercise.id)).toMatchObject({
      names: { pt: 'Remada sentada unilateral', en: 'Remada sentada unilateral' },
      muscleGroup: 'shoulders',
      equipment: 'cable',
    })
  })

  it('refuses a name another exercise has, but keeps its own', async () => {
    const exercise = await custom()

    // "Bench Press" is a library exercise (English name).
    expect(
      await updateCustomExercise(db, exercise.id, {
        name: 'bench press',
        muscleGroup: 'back',
        equipment: 'machine',
      }),
    ).toBe('nameTaken')
    expect(
      await updateCustomExercise(db, exercise.id, {
        name: 'REMADA articulada',
        muscleGroup: 'back',
        equipment: 'cable',
      }),
    ).toBe('saved')
  })

  it('library exercises are not editable or deletable', async () => {
    const bench = await findExerciseByName(db, 'Bench Press')

    expect(
      await updateCustomExercise(db, bench!.id, {
        name: 'X',
        muscleGroup: 'chest',
        equipment: 'barbell',
      }),
    ).toBe('notCustom')
    expect(await deleteCustomExercise(db, bench!.id)).toEqual({ kind: 'notCustom' })
  })

  it('deleting is blocked while an active routine uses the exercise', async () => {
    const exercise = await custom()
    const splitId = await createSplit(db, 'Upper/Lower')
    const upper = await createRoutine(db, 'Upper A', splitId)
    const lower = await createRoutine(db, 'Lower A', splitId)
    const removed = await createRoutine(db, 'Old', splitId)
    for (const routineId of [lower, upper, removed]) {
      await addExerciseToRoutine(db, routineId, exercise.id)
    }
    await softDelete(db.routines, removed) // a deleted routine does not count

    expect(await routinesUsingExercise(db, exercise.id)).toEqual(['Upper A', 'Lower A'])
    expect(await deleteCustomExercise(db, exercise.id)).toEqual({
      kind: 'inUse',
      routines: ['Upper A', 'Lower A'],
    })
    expect((await db.exercises.get(exercise.id))?.deletedAt).toBeNull()
  })

  it('an unused exercise is soft-deleted and leaves the library', async () => {
    const exercise = await custom()

    expect(await deleteCustomExercise(db, exercise.id)).toEqual({ kind: 'deleted' })

    expect((await db.exercises.get(exercise.id))?.deletedAt).not.toBeNull()
    expect(await findExerciseByName(db, 'Remada articulada')).toBeUndefined()
  })
})
