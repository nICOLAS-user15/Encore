import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp, Workout } from '../../db/types'

/** O treino em andamento (sem `endedAt`), se existir. Só pode haver um. */
export async function getActiveWorkout(db: EncoreDB): Promise<Workout | undefined> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((workout) => isActive(workout) && workout.endedAt === null)
    .first()
}

export type ActiveWorkoutInfo = {
  workout: Workout
  /** Nome da rotina; `null` = treino livre. */
  routineName: string | null
}

/** O treino em andamento com o nome da rotina (para a faixa "Treino em andamento"). */
export async function getActiveWorkoutInfo(
  db: EncoreDB,
): Promise<ActiveWorkoutInfo | null> {
  const workout = await getActiveWorkout(db)
  if (!workout) {
    return null
  }
  const routine = workout.routineId ? await db.routines.get(workout.routineId) : undefined
  return { workout, routineName: routine?.name ?? null }
}

/** Treinos finalizados, do mais recente para o mais antigo. */
export async function listFinishedWorkouts(db: EncoreDB): Promise<Workout[]> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((workout) => isActive(workout) && workout.endedAt !== null)
    .toArray()
}

/** Séries de um treino, na ordem (usa o índice [workoutId+position]). */
export async function listWorkoutSets(db: EncoreDB, workoutId: ID): Promise<SetEntry[]> {
  return db.setEntries
    .where('[workoutId+position]')
    .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
    .filter(isActive)
    .toArray()
}

export type LastPerformance = {
  workoutId: ID
  date: Timestamp
  /** Séries concluídas deste exercício naquele treino, em ordem. */
  sets: SetEntry[]
}

/**
 * O que foi feito neste exercício da última vez (séries concluídas do treino
 * mais recente que o contém). `excludeWorkoutId` ignora o treino atual.
 */
export async function getLastPerformance(
  db: EncoreDB,
  exerciseId: ID,
  excludeWorkoutId?: ID,
): Promise<LastPerformance | null> {
  // Índice [exerciseId+completedAt] de trás para frente = mais recente primeiro.
  // Séries não concluídas (completedAt null) nem estão no índice.
  const mostRecent = await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    // Aquecimento não conta como "última vez".
    .filter(
      (set) =>
        isActive(set) && set.workoutId !== excludeWorkoutId && set.type !== 'warmup',
    )
    .first()

  if (!mostRecent) {
    return null
  }

  const workoutSets = await listWorkoutSets(db, mostRecent.workoutId)
  return {
    workoutId: mostRecent.workoutId,
    date: mostRecent.completedAt ?? mostRecent.updatedAt,
    sets: workoutSets.filter(
      (set) =>
        set.exerciseId === exerciseId &&
        set.completedAt !== null &&
        set.type !== 'warmup',
    ),
  }
}
