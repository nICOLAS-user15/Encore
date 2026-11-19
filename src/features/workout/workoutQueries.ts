import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp, Workout } from '../../db/types'

/** The workout in progress (no `endedAt`), if any. There can be only one. */
export async function getActiveWorkout(db: EncoreDB): Promise<Workout | undefined> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((workout) => isActive(workout) && workout.endedAt === null)
    .first()
}

export type ActiveWorkoutInfo = {
  workout: Workout
  /** Routine name; `null` = free workout. */
  routineName: string | null
}

/** The workout in progress with the routine name (for the "Treino em andamento" strip). */
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

/** Finished workouts, newest to oldest. */
export async function listFinishedWorkouts(db: EncoreDB): Promise<Workout[]> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((workout) => isActive(workout) && workout.endedAt !== null)
    .toArray()
}

/** Sets of a workout, in order (uses the [workoutId+position] index). */
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
  /** Completed sets of this exercise in that workout, in order. */
  sets: SetEntry[]
}

/**
 * What was done in this exercise last time (completed sets of the most
 * recent workout that contains it). `excludeWorkoutId` ignores the current workout.
 */
export async function getLastPerformance(
  db: EncoreDB,
  exerciseId: ID,
  excludeWorkoutId?: ID,
): Promise<LastPerformance | null> {
  // [exerciseId+completedAt] index in reverse = most recent first.
  // Uncompleted sets (completedAt null) are not even in the index.
  const mostRecent = await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    // Warm-up does not count as "last time".
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
