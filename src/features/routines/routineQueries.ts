import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, Routine, RoutineExercise } from '../../db/types'

export type RoutineWithExercises = {
  routine: Routine
  items: RoutineExercise[]
}

/** Exercícios de uma rotina, na ordem (usa o índice [routineId+position]). */
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

/** Uma rotina com seus exercícios, ou `null` se não existe / foi excluída. */
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

/** Rotinas ativas, na ordem definida, cada uma com seus exercícios. */
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
