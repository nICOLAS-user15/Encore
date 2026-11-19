import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { createSplit } from '../splits/splitActions'
import {
  blankDraft,
  draftFromRoutine,
  isDraftDirty,
  moveDraftItem,
  newDraftItem,
  updateDraftItem,
  type RoutineDraft,
} from './routineDraft'
import { saveRoutine } from './routineActions'
import { getRoutineWithExercises, listRoutinesWithExercises } from './routineQueries'

const [bench, incline, fly] = SEED_EXERCISES.map((seed) => seed.id)

let db: EncoreDB
let splitId: string

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await syncSeedExercises(db)
  splitId = await createSplit(db, 'PPL')
})

afterEach(async () => {
  await db.delete()
})

/** Cria uma rotina pelo mesmo caminho do botão Salvar. */
async function create(name: string, exercises: string[] = [], position = 99) {
  const draft: RoutineDraft = {
    ...blankDraft(splitId, position),
    name,
    items: exercises.map((exerciseId) => newDraftItem(exerciseId)),
  }
  return saveRoutine(db, null, draft)
}

/** O rascunho de uma rotina que já existe, como a tela o monta ao abrir. */
async function draftOf(routineId: string): Promise<RoutineDraft> {
  const entry = await getRoutineWithExercises(db, routineId)
  const all = await listRoutinesWithExercises(db)
  const siblings = all.filter((item) => item.routine.splitId === entry!.routine.splitId)
  const position = siblings.findIndex((item) => item.routine.id === routineId)
  return draftFromRoutine(entry!.routine, entry!.items, position)
}

describe('saveRoutine: rotina nova', () => {
  it('só existe depois de salvar, e já com os exercícios na ordem do rascunho', async () => {
    expect(await db.routines.count()).toBe(0)

    const id = await create('  Push  ', [bench, incline])

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.routine).toMatchObject({ name: 'Push', splitId, notes: '' })
    expect(entry?.items.map((item) => [item.position, item.exerciseId])).toEqual([
      [0, bench],
      [1, incline],
    ])
    // Meta padrão dos itens novos: 3 × 8–12, descanso "padrão" (null).
    expect(entry?.items[0]).toMatchObject({
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: null,
    })
  })

  it('guarda as observações e entra na posição pedida', async () => {
    await create('Push', [], 0)
    await create('Pull', [], 1)

    const id = await saveRoutine(db, null, {
      ...blankDraft(splitId, 1),
      name: 'Legs',
      notes: 'Mobilidade antes',
    })

    const names = (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name)
    expect(names).toEqual(['Push', 'Legs', 'Pull'])
    expect((await getRoutineWithExercises(db, id))?.routine.notes).toBe(
      'Mobilidade antes',
    )
  })
})

describe('saveRoutine: rotina existente', () => {
  it('aplica nome, exercícios removidos, novos, editados e reordenados de uma vez', async () => {
    const id = await create('Push', [bench, incline])
    const draft = await draftOf(id)
    const [benchItem, inclineItem] = draft.items

    const edited: RoutineDraft = {
      ...draft,
      name: 'Push A',
      items: [
        newDraftItem(fly), // novo, na frente
        updateDraftItem([inclineItem], inclineItem.key, { targetSets: 5 })[0], // editado, sobe
        // `benchItem` saiu do rascunho: será excluído.
      ],
    }
    expect(benchItem.id).toBeDefined()

    await saveRoutine(db, id, edited)

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.routine.name).toBe('Push A')
    expect(
      entry?.items.map((item) => [item.position, item.exerciseId, item.targetSets]),
    ).toEqual([
      [0, fly, 3],
      [1, incline, 5],
    ])
    // O removido foi excluído de forma lógica (dá para sincronizar).
    expect((await db.routineExercises.get(benchItem.id!))?.deletedAt).toBeTypeOf('number')
    // O editado é o MESMO registro (não foi recriado).
    expect(entry?.items[1].id).toBe(inclineItem.id)
  })

  it('não mexe no que não mudou (o updatedAt continua igual)', async () => {
    const id = await create('Push', [bench])
    const before = await getRoutineWithExercises(db, id)

    await saveRoutine(db, id, await draftOf(id)) // salvar sem mudar nada

    const after = await getRoutineWithExercises(db, id)
    expect(after?.routine.updatedAt).toBe(before?.routine.updatedAt)
    expect(after?.items[0].updatedAt).toBe(before?.items[0].updatedAt)
  })

  it('muda a posição na sequência da divisão', async () => {
    const a = await create('A', [], 0)
    await create('B', [], 1)
    const c = await create('C', [], 2)

    // C sobe para a primeira posição.
    await saveRoutine(db, c, { ...(await draftOf(c)), position: 0 })

    expect(
      (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name),
    ).toEqual(['C', 'A', 'B'])
    expect(a).toBeDefined()
  })

  it('muda de divisão: vai para a posição pedida da nova, e a antiga continua em ordem', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const push = await create('Push', [], 0)
    await create('Pull', [], 1)
    const upperDraft = { ...blankDraft(ul, 0), name: 'Upper' }
    await saveRoutine(db, null, upperDraft)

    // Push vai para Upper / Lower, na frente do Upper.
    await saveRoutine(db, push, { ...(await draftOf(push)), splitId: ul, position: 0 })

    const all = await listRoutinesWithExercises(db)
    const names = (id: string) =>
      all
        .filter((entry) => entry.routine.splitId === id)
        .map((entry) => entry.routine.name)
    expect(names(ul)).toEqual(['Push', 'Upper'])
    expect(names(splitId)).toEqual(['Pull'])
    // A divisão de DESTINO é renumerada 0, 1, 2... A de origem só perde a rotina:
    // um "buraco" na numeração não muda nada, porque só importa a ordem relativa.
    expect(
      all.filter((entry) => entry.routine.splitId === ul).map((e) => e.routine.order),
    ).toEqual([0, 1])
  })

  it('recusa salvar uma rotina que não existe mais (e não cria nada)', async () => {
    const before = await db.routines.count()

    await expect(
      saveRoutine(db, 'nao-existe', { ...blankDraft(splitId, 0), name: 'Fantasma' }),
    ).rejects.toThrow('não encontrada')

    expect(await db.routines.count()).toBe(before)
  })
})

describe('rascunho (regras puras)', () => {
  it('isDraftDirty percebe qualquer mudança, e volta a "limpo" se o usuário desfaz', () => {
    const initial = blankDraft(splitId, 0)
    expect(isDraftDirty(initial, initial)).toBe(false)
    expect(isDraftDirty({ ...initial, name: 'Push' }, initial)).toBe(true)
    expect(isDraftDirty({ ...initial, name: '' }, initial)).toBe(false)
    expect(isDraftDirty({ ...initial, items: [newDraftItem(bench)] }, initial)).toBe(true)
  })

  it('moveDraftItem troca com o vizinho e ignora as pontas', () => {
    const items = [newDraftItem(bench), newDraftItem(incline), newDraftItem(fly)]

    expect(moveDraftItem(items, 1, -1).map((item) => item.exerciseId)).toEqual([
      incline,
      bench,
      fly,
    ])
    expect(moveDraftItem(items, 0, -1)).toBe(items) // já é o primeiro
    expect(moveDraftItem(items, 2, 1)).toBe(items) // já é o último
  })

  it('updateDraftItem mantém a faixa de repetições coerente (mín ≤ máx)', () => {
    const [item] = [newDraftItem(bench)] // 8–12
    const up = updateDraftItem([item], item.key, { targetRepsMin: 15 })[0]
    expect([up.targetRepsMin, up.targetRepsMax]).toEqual([15, 15])
    const down = updateDraftItem([item], item.key, { targetRepsMax: 5 })[0]
    expect([down.targetRepsMin, down.targetRepsMax]).toEqual([5, 5])
  })

  it('draftFromRoutine cobre itens antigos, sem o campo de descanso', async () => {
    const id = await create('Push', [bench])
    // Registro como estava antes de o campo existir.
    const [item] = (await getRoutineWithExercises(db, id))!.items
    await db.routineExercises.update(item.id, { restSeconds: undefined })

    const draft = await draftOf(id)

    expect(draft.items[0].restSeconds).toBeNull()
  })
})
