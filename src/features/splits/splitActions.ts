import type { EncoreDB } from '../../db/db'
import { createRecord, isActive, softDelete, updateRecord } from '../../db/repository'
import type { ID, Split } from '../../db/types'
import { deleteRoutine } from '../routines/routineActions'

/*
 * Tudo que ESCREVE nas divisões. Cada função grava na hora (sem botão "Salvar").
 */

/** Cria uma divisão vazia no fim das abas e devolve o id dela. */
export async function createSplit(db: EncoreDB, name: string): Promise<ID> {
  return db.transaction('rw', db.splits, async () => {
    const splits = await db.splits.filter(isActive).toArray()
    const lastOrder = Math.max(-1, ...splits.map((split) => split.order))
    const split = await createRecord(db.splits, { name, notes: '', order: lastOrder + 1 })
    return split.id
  })
}

export async function updateSplit(
  db: EncoreDB,
  splitId: ID,
  changes: Partial<Pick<Split, 'name' | 'notes'>>,
): Promise<void> {
  await updateRecord(db.splits, splitId, changes)
}

/**
 * Exclui a divisão E as rotinas dela (exclusão lógica: nada some de verdade).
 * Os treinos já feitos com essas rotinas continuam no histórico. A tela pede
 * confirmação dizendo quantas rotinas vão junto.
 *
 * Tudo numa transação: se algo falhar no meio, nada fica pela metade.
 * Devolve quantas rotinas foram excluídas junto.
 */
export async function deleteSplit(db: EncoreDB, splitId: ID): Promise<number> {
  return db.transaction('rw', [db.splits, db.routines, db.routineExercises], async () => {
    const routines = await db.routines.filter(isActive).toArray()
    const inSplit = routines.filter((routine) => routine.splitId === splitId)
    for (const routine of inSplit) {
      await deleteRoutine(db, routine.id)
    }
    await softDelete(db.splits, splitId)
    return inSplit.length
  })
}

/** Move a divisão uma posição para a esquerda (-1) ou direita (+1) nas abas. */
export async function moveSplit(
  db: EncoreDB,
  splitId: ID,
  direction: -1 | 1,
): Promise<void> {
  await db.transaction('rw', db.splits, async () => {
    const splits = await db.splits.orderBy('order').filter(isActive).toArray()
    const index = splits.findIndex((split) => split.id === splitId)
    const target = index + direction
    if (index === -1 || target < 0 || target >= splits.length) {
      return
    }
    // Troca de lugar e renumera 0..n: funciona mesmo se duas divisões tinham o mesmo
    // `order` (ex.: vindas de backups de aparelhos diferentes), onde só trocar os valores
    // não mudaria nada.
    const next = [...splits]
    ;[next[index], next[target]] = [next[target], next[index]]
    for (const [order, split] of next.entries()) {
      if (split.order !== order) {
        await updateRecord(db.splits, split.id, { order })
      }
    }
  })
}
