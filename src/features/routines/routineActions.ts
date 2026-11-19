import type { EncoreDB } from '../../db/db'
import { createRecord, isActive, softDelete, updateRecord } from '../../db/repository'
import type { ID, Routine, RoutineExercise } from '../../db/types'
import { DEFAULT_TARGET, type RoutineDraft } from './routineDraft'
import { listRoutineExercises } from './routineQueries'

/*
 * ---------------------------------------------------------------------------
 * Create and edit routines.
 *
 * The edit screen works on a DRAFT (routineDraft.ts) and only writes when the
 * user taps "Salvar": that is `saveRoutine`, which applies everything at once. The
 * smaller functions below are the steps it uses.
 * ---------------------------------------------------------------------------
 */

/** Free position at the end of a split's sequence. */
async function nextRoutineOrder(db: EncoreDB, splitId: ID): Promise<number> {
  const routines = await db.routines.filter(isActive).toArray()
  const inSplit = routines.filter((routine) => routine.splitId === splitId)
  return Math.max(-1, ...inSplit.map((routine) => routine.order)) + 1
}

/** Creates an empty routine at the end of the split's sequence and returns its id. */
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
 * Moves the routine to another split. It goes to the end of the new split's sequence
 * (carrying over its old position makes no sense).
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

/** Deletes the routine and its exercises (soft delete). Past workouts stay in the history. */
export async function deleteRoutine(db: EncoreDB, routineId: ID): Promise<void> {
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    for (const item of await listRoutineExercises(db, routineId)) {
      await softDelete(db.routineExercises, item.id)
    }
    await softDelete(db.routines, routineId)
  })
}

/**
 * Puts the routine at the given position (0 = first) in its split's sequence.
 * Renumbers the whole split (0, 1, 2...), touching only the routines whose number changed.
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

/** Adds an exercise at the end of the routine, with the default target. */
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
 * Rest of a routine exercise, or `null` (= Settings default).
 * The `?? null` covers items saved before the field existed (no migration).
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

/** Did any editable field of the exercise change? (Avoids rewriting, and touching `updatedAt`, needlessly.) */
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
 * The editor's "Salvar" button: applies the whole draft at once.
 *
 * - `routineId === null`: new routine (created here; it does not exist before that).
 * - Routine data (name, notes) and the split.
 * - Exercises: those removed from the draft are deleted (soft delete), new ones
 *   are created and changed ones are updated, already in the draft's order.
 * - Routine position in the split's sequence.
 *
 * All in one transaction: if something fails midway, nothing is left half done.
 * Returns the routine id.
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
        throw new Error(`Routine ${id} not found`)
      }
      if (current.name !== name || current.notes !== draft.notes) {
        await updateRoutine(db, id, { name, notes: draft.notes })
      }
      await moveRoutineToSplit(db, id, draft.splitId) // no effect if the split is the same
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
