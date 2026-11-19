import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, Routine, RoutineExercise } from '../../db/types'

export type RoutineWithExercises = {
  routine: Routine
  items: RoutineExercise[]
}

/** Exercises of a routine, in order (uses the [routineId+position] index). */
export async function listRoutineExercises(
  db: EncoreDB,
  routineId: ID,
): Promise<RoutineExercise[]> {
  return db.routineExercises
    .where('[routineId+position]')
    .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
    .filter(isActive)
    .toArray()
}

/** A routine with its exercises, or `null` if it does not exist / was deleted. */
export async function getRoutineWithExercises(
  db: EncoreDB,
  routineId: ID,
): Promise<RoutineWithExercises | null> {
  const routine = await db.routines.get(routineId)
  if (!routine || !isActive(routine)) {
    return null
  }
  return { routine, items: await listRoutineExercises(db, routineId) }
}

/** Active routines, in the defined order, each with its exercises. */
export async function listRoutinesWithExercises(
  db: EncoreDB,
): Promise<RoutineWithExercises[]> {
  const routines = await db.routines.orderBy('order').filter(isActive).toArray()
  return Promise.all(
    routines.map(async (routine) => ({
      routine,
      items: await listRoutineExercises(db, routine.id),
    })),
  )
}
