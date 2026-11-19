import type { EncoreDB } from '../../db/db'
import { createRecord, isActive, softDelete, updateRecord } from '../../db/repository'
import type { ID, Split } from '../../db/types'
import { deleteRoutine } from '../routines/routineActions'

/*
 * Everything that WRITES to splits. Each function writes immediately (no "Salvar" button).
 */

/** Creates an empty split at the end of the tabs and returns its id. */
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
 * Deletes the split AND its routines (soft delete: nothing is really removed).
 * Workouts already done with those routines stay in the history. The screen asks for
 * confirmation saying how many routines go along.
 *
 * All in one transaction: if something fails midway, nothing is left half done.
 * Returns how many routines were deleted along with it.
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

/** Moves the split one position left (-1) or right (+1) in the tabs. */
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
    // Swaps places and renumbers 0..n: works even if two splits had the same
    // `order` (e.g. coming from backups of different devices), where just swapping values
    // would change nothing.
    const next = [...splits]
    ;[next[index], next[target]] = [next[target], next[index]]
    for (const [order, split] of next.entries()) {
      if (split.order !== order) {
        await updateRecord(db.splits, split.id, { order })
      }
    }
  })
}
