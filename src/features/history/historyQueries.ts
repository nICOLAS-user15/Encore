import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Workout } from '../../db/types'
import { listFinishedWorkouts, listWorkoutSets } from '../workout/workoutQueries'

export type WorkoutSummary = {
  workout: Workout
  /** Nome da rotina usada, ou `null` para treino livre. */
  routineName: string | null
  sets: SetEntry[]
}

async function summarize(db: EncoreDB, workout: Workout): Promise<WorkoutSummary> {
  const routine = workout.routineId ? await db.routines.get(workout.routineId) : undefined
  return {
    workout,
    routineName: routine?.name ?? null,
    sets: await listWorkoutSets(db, workout.id),
  }
}

/**
 * Treinos finalizados com suas séries, do mais recente para o mais antigo.
 * (Faz uma consulta de séries por treino. Com centenas de treinos isso ainda é
 * rápido no IndexedDB; se um dia pesar, dá para paginar a lista.)
 */
export async function listWorkoutSummaries(db: EncoreDB): Promise<WorkoutSummary[]> {
  const workouts = await listFinishedWorkouts(db)
  return Promise.all(workouts.map((workout) => summarize(db, workout)))
}

/**
 * A vez anterior da MESMA rotina (o treino finalizado imediatamente antes deste).
 * Treino livre não tem com o que comparar: devolve `null`.
 */
export async function getPreviousSummary(
  db: EncoreDB,
  workout: Workout,
): Promise<WorkoutSummary | null> {
  if (workout.routineId === null) {
    return null
  }
  // listFinishedWorkouts vem do mais recente para o mais antigo.
  const previous = (await listFinishedWorkouts(db)).find(
    (other) =>
      other.routineId === workout.routineId && other.startedAt < workout.startedAt,
  )
  return previous ? summarize(db, previous) : null
}

/** Um treino finalizado, ou `null` se não existe / foi excluído / ainda está em andamento. */
export async function getWorkoutSummary(
  db: EncoreDB,
  workoutId: ID,
): Promise<WorkoutSummary | null> {
  const workout = await db.workouts.get(workoutId)
  if (!workout || !isActive(workout) || workout.endedAt === null) {
    return null
  }
  return summarize(db, workout)
}
