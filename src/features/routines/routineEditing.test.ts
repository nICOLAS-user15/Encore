import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { createSplit } from '../splits/splitActions'
import {
  addExerciseToRoutine,
  createRoutine,
  deleteRoutine,
  removeRoutineExercise,
  updateRoutine,
  updateRoutineExercise,
} from './routineActions'
import { getRoutineWithExercises, listRoutinesWithExercises } from './routineQueries'

const [bench, incline] = SEED_EXERCISES.map((seed) => seed.id)

let db: EncoreDB
// Toda rotina pertence a uma divisão: estes testes usam uma só.
let splitId: string

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await syncSeedExercises(db)
  splitId = await createSplit(db, 'Divisão de teste')
})

afterEach(async () => {
  await db.delete()
})

describe('criar e editar rotinas', () => {
  it('cria rotinas vazias no fim da sequência', async () => {
    const a = await createRoutine(db, 'Push', splitId)
    const b = await createRoutine(db, 'Pull', splitId)

    const routines = await listRoutinesWithExercises(db)
    expect(routines.map((entry) => entry.routine.id)).toEqual([a, b])
    expect(routines[0].items).toEqual([])
  })

  it('renomeia e guarda observações', async () => {
    const id = await createRoutine(db, 'Nova rotina', splitId)

    await updateRoutine(db, id, { name: 'Peito e tríceps', notes: 'Aquecer bem' })

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.routine).toMatchObject({
      name: 'Peito e tríceps',
      notes: 'Aquecer bem',
    })
  })

  it('adiciona exercícios no fim, com a meta padrão', async () => {
    const id = await createRoutine(db, 'Push', splitId)

    await addExerciseToRoutine(db, id, bench)
    const second = await addExerciseToRoutine(db, id, incline)

    expect(second).toMatchObject({
      position: 1,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      referenceWeightKg: null,
    })
  })

  it('edita a meta de um exercício', async () => {
    const id = await createRoutine(db, 'Push', splitId)
    const item = await addExerciseToRoutine(db, id, bench)

    await updateRoutineExercise(db, item.id, {
      targetSets: 4,
      targetRepsMin: 5,
      targetRepsMax: 8,
      referenceWeightKg: 60,
    })

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.items[0]).toMatchObject({
      targetSets: 4,
      targetRepsMin: 5,
      targetRepsMax: 8,
      referenceWeightKg: 60,
    })
  })

  it('remove um exercício da rotina', async () => {
    const id = await createRoutine(db, 'Push', splitId)
    const item = await addExerciseToRoutine(db, id, bench)

    await removeRoutineExercise(db, item.id)

    expect((await getRoutineWithExercises(db, id))?.items).toEqual([])
    expect((await db.routineExercises.get(item.id))?.deletedAt).toBeTypeOf('number')
  })

  it('excluir a rotina tira ela e os exercícios dela das listas', async () => {
    const id = await createRoutine(db, 'Push', splitId)
    await addExerciseToRoutine(db, id, bench)

    await deleteRoutine(db, id)

    expect(await getRoutineWithExercises(db, id)).toBeNull()
    expect(await listRoutinesWithExercises(db)).toEqual([])
    const leftovers = await db.routineExercises
      .filter((i) => i.deletedAt === null)
      .count()
    expect(leftovers).toBe(0)
  })
})
