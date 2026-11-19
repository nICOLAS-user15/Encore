import type { EncoreDB } from '../../db/db'
import { createRecord, isActive, softDelete, updateRecord } from '../../db/repository'
import type { ID, Routine, RoutineExercise } from '../../db/types'
import { DEFAULT_TARGET, type RoutineDraft } from './routineDraft'
import { listRoutineExercises } from './routineQueries'

/*
 * ---------------------------------------------------------------------------
 * Criar e editar rotinas.
 *
 * A tela de edição trabalha com um RASCUNHO (routineDraft.ts) e só grava quando o
 * usuário toca em "Salvar": é a `saveRoutine`, que aplica tudo de uma vez. As
 * funções menores abaixo são os passos que ela usa.
 * ---------------------------------------------------------------------------
 */

/** Posição livre no fim da sequência de uma divisão. */
async function nextRoutineOrder(db: EncoreDB, splitId: ID): Promise<number> {
  const routines = await db.routines.filter(isActive).toArray()
  const inSplit = routines.filter((routine) => routine.splitId === splitId)
  return Math.max(-1, ...inSplit.map((routine) => routine.order)) + 1
}

/** Cria uma rotina vazia no fim da sequência da divisão e devolve o id dela. */
export async function createRoutine(
  db: EncoreDB,
  name: string,
  splitId: ID,
): Promise<ID> {
  return db.transaction('rw', db.routines, async () => {
    const routine = await createRecord(db.routines, {
      name,
      splitId,
      notes: '',
      order: await nextRoutineOrder(db, splitId),
    })
    return routine.id
  })
}

/**
 * Muda a rotina de divisão. Ela vai para o fim da sequência da divisão nova
 * (não faz sentido carregar a posição que tinha na antiga).
 */
export async function moveRoutineToSplit(
  db: EncoreDB,
  routineId: ID,
  splitId: ID,
): Promise<void> {
  await db.transaction('rw', db.routines, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine || routine.splitId === splitId) {
      return
    }
    await updateRecord(db.routines, routineId, {
      splitId,
      order: await nextRoutineOrder(db, splitId),
    })
  })
}

export async function updateRoutine(
  db: EncoreDB,
  routineId: ID,
  changes: Partial<Pick<Routine, 'name' | 'notes'>>,
): Promise<void> {
  await updateRecord(db.routines, routineId, changes)
}

/** Exclui a rotina e os exercícios dela (exclusão lógica). Treinos antigos continuam no histórico. */
export async function deleteRoutine(db: EncoreDB, routineId: ID): Promise<void> {
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    for (const item of await listRoutineExercises(db, routineId)) {
      await softDelete(db.routineExercises, item.id)
    }
    await softDelete(db.routines, routineId)
  })
}

/**
 * Põe a rotina na posição pedida (0 = a primeira) da sequência da divisão dela.
 * Renumera a divisão inteira (0, 1, 2...), mexendo só nas rotinas que mudaram de número.
 */
async function placeRoutine(
  db: EncoreDB,
  routineId: ID,
  position: number,
): Promise<void> {
  const all = await db.routines.orderBy('order').filter(isActive).toArray()
  const routine = all.find((item) => item.id === routineId)
  if (!routine) {
    return
  }
  const sequence = all.filter(
    (item) => item.splitId === routine.splitId && item.id !== routineId,
  )
  sequence.splice(Math.min(Math.max(position, 0), sequence.length), 0, routine)
  for (const [index, item] of sequence.entries()) {
    if (item.order !== index) {
      await updateRecord(db.routines, item.id, { order: index })
    }
  }
}

/** Adiciona um exercício no fim da rotina, com a meta padrão. */
export async function addExerciseToRoutine(
  db: EncoreDB,
  routineId: ID,
  exerciseId: ID,
): Promise<RoutineExercise> {
  return db.transaction('rw', db.routineExercises, async () => {
    const items = await listRoutineExercises(db, routineId)
    const lastPosition = Math.max(-1, ...items.map((item) => item.position))
    return createRecord(db.routineExercises, {
      routineId,
      exerciseId,
      position: lastPosition + 1,
      ...DEFAULT_TARGET,
      referenceWeightKg: null,
      referenceReps: null,
      notes: '',
      restSeconds: null,
    })
  })
}

export type RoutineItemChanges = Partial<
  Pick<
    RoutineExercise,
    | 'position'
    | 'targetSets'
    | 'targetRepsMin'
    | 'targetRepsMax'
    | 'referenceWeightKg'
    | 'notes'
    | 'restSeconds'
  >
>

/**
 * Descanso de um exercício da rotina, ou `null` (= padrão das Configurações).
 * O `?? null` cobre itens gravados antes do campo existir (sem migração).
 */
export function restSecondsOf(item: Pick<RoutineExercise, 'restSeconds'>): number | null {
  return item.restSeconds ?? null
}

export async function updateRoutineExercise(
  db: EncoreDB,
  itemId: ID,
  changes: RoutineItemChanges,
): Promise<void> {
  await updateRecord(db.routineExercises, itemId, changes)
}

export async function removeRoutineExercise(db: EncoreDB, itemId: ID): Promise<void> {
  await softDelete(db.routineExercises, itemId)
}

/** Algum campo editável do exercício mudou? (Evita regravar, e mexer no `updatedAt`, sem necessidade.) */
function itemChanged(
  old: RoutineExercise,
  fields: Required<RoutineItemChanges>,
): boolean {
  return (
    old.position !== fields.position ||
    old.targetSets !== fields.targetSets ||
    old.targetRepsMin !== fields.targetRepsMin ||
    old.targetRepsMax !== fields.targetRepsMax ||
    old.referenceWeightKg !== fields.referenceWeightKg ||
    old.notes !== fields.notes ||
    restSecondsOf(old) !== fields.restSeconds
  )
}

/**
 * O botão "Salvar" do editor: aplica o rascunho inteiro de uma vez.
 *
 * - `routineId === null`: rotina nova (é criada aqui; antes disso ela não existe).
 * - Dados da rotina (nome, observações) e a divisão.
 * - Exercícios: os que saíram do rascunho são excluídos (exclusão lógica), os
 *   novos são criados e os que mudaram são atualizados, já na ordem do rascunho.
 * - Posição da rotina na sequência da divisão.
 *
 * Tudo numa transação: se algo falhar no meio, nada fica pela metade.
 * Devolve o id da rotina.
 */
export async function saveRoutine(
  db: EncoreDB,
  routineId: ID | null,
  draft: RoutineDraft,
): Promise<ID> {
  return db.transaction('rw', [db.routines, db.routineExercises], async () => {
    const name = draft.name.trim()
    let id: ID

    if (routineId === null) {
      id = await createRoutine(db, name, draft.splitId)
      if (draft.notes !== '') {
        await updateRoutine(db, id, { notes: draft.notes })
      }
    } else {
      id = routineId
      const current = await db.routines.get(id)
      if (!current || !isActive(current)) {
        throw new Error(`Rotina ${id} não encontrada`)
      }
      if (current.name !== name || current.notes !== draft.notes) {
        await updateRoutine(db, id, { name, notes: draft.notes })
      }
      await moveRoutineToSplit(db, id, draft.splitId) // sem efeito se a divisão é a mesma
    }

    const existing = routineId === null ? [] : await listRoutineExercises(db, id)
    const existingById = new Map(existing.map((item) => [item.id, item]))
    const kept = new Set(draft.items.flatMap((item) => (item.id ? [item.id] : [])))

    for (const old of existing) {
      if (!kept.has(old.id)) {
        await removeRoutineExercise(db, old.id)
      }
    }

    for (const [position, item] of draft.items.entries()) {
      const fields = {
        position,
        targetSets: item.targetSets,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
        referenceWeightKg: item.referenceWeightKg,
        notes: item.notes,
        restSeconds: item.restSeconds,
      }
      const old = item.id ? existingById.get(item.id) : undefined
      if (old) {
        if (itemChanged(old, fields)) {
          await updateRoutineExercise(db, old.id, fields)
        }
      } else {
        const created = await addExerciseToRoutine(db, id, item.exerciseId)
        await updateRoutineExercise(db, created.id, fields)
      }
    }

    await placeRoutine(db, id, draft.position)
    return id
  })
}
