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

/** O rascunho de uma rotina que já existe, como o editor o monta ao abrir. */
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

describe('divisões: criar, renomear, ordenar', () => {
  it('cria divisões no fim das abas e renomeia', async () => {
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

  it('muda a posição da divisão nas abas', async () => {
    const a = await createSplit(db, 'A')
    const b = await createSplit(db, 'B')
    const c = await createSplit(db, 'C')

    await moveSplit(db, c, -1)
    expect((await listSplits(db)).map((split) => split.id)).toEqual([a, c, b])

    // Na ponta, não faz nada (e não quebra).
    await moveSplit(db, a, -1)
    expect((await listSplits(db)).map((split) => split.id)).toEqual([a, c, b])
  })
})

describe('divisões: excluir', () => {
  it('exclui uma divisão vazia', async () => {
    const id = await createSplit(db, 'Antiga')

    expect(await deleteSplit(db, id)).toBe(0)

    expect(await listSplits(db)).toEqual([])
    expect((await db.splits.get(id))?.deletedAt).toBeTypeOf('number')
  })

  it('exclui a divisão junto com as rotinas e os exercícios delas', async () => {
    const ppl = await createSplit(db, 'PPL')
    const ul = await createSplit(db, 'Upper / Lower')
    const push = await createRoutine(db, 'Push', ppl)
    await createRoutine(db, 'Pull', ppl)
    await createRoutine(db, 'Upper A', ul)
    const item = await addExerciseToRoutine(db, push, 'supino')

    // Devolve quantas rotinas foram junto.
    expect(await deleteSplit(db, ppl)).toBe(2)

    // A divisão e as rotinas dela saíram das listas...
    expect((await listSplits(db)).map((split) => split.name)).toEqual(['Upper / Lower'])
    expect(
      (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name),
    ).toEqual(['Upper A'])
    expect((await db.routineExercises.get(item.id))?.deletedAt).toBeTypeOf('number')
    // ...mas nada foi apagado de verdade (exclusão lógica): dá para sincronizar a exclusão.
    expect(await db.routines.count()).toBe(3)
  })

  it('os treinos já feitos continuam no histórico', async () => {
    const ppl = await createSplit(db, 'PPL')
    const push = await createRoutine(db, 'Push', ppl)
    const workout = await startWorkout(db, push)
    const [first] = await listWorkoutSets(db, workout.id)
    expect(first).toBeUndefined() // rotina vazia: sem séries
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
    // O nome da rotina excluída continua aparecendo no treino antigo.
    expect(history[0].routineName).toBe('Push')
    expect(history[0].sets).toHaveLength(1)
  })
})

describe('rotinas dentro das divisões', () => {
  it('a sequência de cada divisão é independente', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const ppl = await createSplit(db, 'PPL')
    const upper = await createRoutine(db, 'Upper', ul)
    const push = await createRoutine(db, 'Push', ppl)
    const lower = await createRoutine(db, 'Lower', ul)
    const pull = await createRoutine(db, 'Pull', ppl)

    // Subir "Lower" para a 1ª posição troca com "Upper", e NUNCA com "Push" (outra divisão).
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

  it('mover uma rotina de divisão a põe no fim da divisão nova', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const ppl = await createSplit(db, 'PPL')
    await createRoutine(db, 'Push', ppl)
    const upper = await createRoutine(db, 'Upper', ul)

    await moveRoutineToSplit(db, upper, ppl)

    const all = await listRoutinesWithExercises(db)
    const inPpl = all.filter((entry) => entry.routine.splitId === ppl)
    expect(inPpl.map((entry) => entry.routine.name)).toEqual(['Push', 'Upper'])
    // Agora "Upper / Lower" está vazia e pode ser excluída.
    expect(await deleteSplit(db, ul)).toBe(0)
  })
})

describe('regras puras das divisões', () => {
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

  it('resolveActiveSplit usa a salva; se sumiu ou não há, a primeira', () => {
    expect(resolveActiveSplit(splits, 'ppl')?.id).toBe('ppl')
    expect(resolveActiveSplit(splits, 'excluida')?.id).toBe('ul')
    expect(resolveActiveSplit(splits, null)?.id).toBe('ul')
    expect(resolveActiveSplit([], 'ppl')).toBeNull()
  })

  it('routinesOfSplit separa por divisão e leva as órfãs para a primeira', () => {
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

  it('lastRoutineIdInSplit olha só os treinos daquela divisão', () => {
    // Mais recente primeiro: Push (PPL), depois Lower A (Upper/Lower).
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
