import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp, Workout } from '../../db/types'
import { exerciseNoteOf, hasWorkoutBegun } from './workoutStats'

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

/**
 * The workout the user is actually DOING, with the routine name: the open workout, but
 * only once it has begun (`hasWorkoutBegun`). A workout that was only opened (to look
 * at the routine) is not announced as "Treino em andamento" anywhere; tapping the same
 * routine again reopens it (`startWorkout` returns the open one).
 */
export async function getWorkoutInProgress(
  db: EncoreDB,
): Promise<ActiveWorkoutInfo | null> {
  const workout = await getActiveWorkout(db)
  if (!workout || !hasWorkoutBegun(workout, await listWorkoutSets(db, workout.id))) {
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

/**
 * The note left on this exercise in a workout (`''` = none). Kept apart from
 * `getLastPerformance`, which also runs inside transactions that only open `setEntries`.
 */
export async function getExerciseNote(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<string> {
  const workout = await db.workouts.get(workoutId)
  return workout && isActive(workout) ? exerciseNoteOf(workout, exerciseId) : ''
}

/**
 * The completed planned sets of the last `count` workouts that had this exercise, one
 * array per workout, oldest first (plateau detection). Walks the [exerciseId+completedAt]
 * index backwards and stops as soon as it has them: years of history are never read.
 */
export async function listRecentSessionSets(
  db: EncoreDB,
  exerciseId: ID,
  excludeWorkoutId: ID,
  count: number,
): Promise<SetEntry[][]> {
  const byWorkout = new Map<ID, SetEntry[]>()
  await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter(
      (set) =>
        isActive(set) && set.workoutId !== excludeWorkoutId && set.type === 'normal',
    )
    // Stops at the first set of one workout too many (that set is left out).
    .until((set) => !byWorkout.has(set.workoutId) && byWorkout.size >= count)
    .each((set) => {
      byWorkout.set(set.workoutId, [set, ...(byWorkout.get(set.workoutId) ?? [])])
    })
  return [...byWorkout.values()].reverse()
}
