import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Workout } from '../../db/types'
import { listFinishedWorkouts, listWorkoutSets } from '../workout/workoutQueries'

export type WorkoutSummary = {
  workout: Workout
  /** Name of the routine used, or `null` for a free workout. */
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
 * Finished workouts with their sets, from newest to oldest.
 * (Runs one sets query per workout. With hundreds of workouts this is still
 * fast in IndexedDB; if it ever gets heavy, the list can be paginated.)
 */
export async function listWorkoutSummaries(db: EncoreDB): Promise<WorkoutSummary[]> {
  const workouts = await listFinishedWorkouts(db)
  return Promise.all(workouts.map((workout) => summarize(db, workout)))
}

/**
 * The previous time of the SAME routine (the finished workout right before this one).
 * A free workout has nothing to compare with: returns `null`.
 */
export async function getPreviousSummary(
  db: EncoreDB,
  workout: Workout,
): Promise<WorkoutSummary | null> {
  if (workout.routineId === null) {
    return null
  }
  // listFinishedWorkouts comes newest to oldest.
  const previous = (await listFinishedWorkouts(db)).find(
    (other) =>
      other.routineId === workout.routineId && other.startedAt < workout.startedAt,
  )
  return previous ? summarize(db, previous) : null
}

/** A finished workout, or `null` if it does not exist / was deleted / is still in progress. */
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
