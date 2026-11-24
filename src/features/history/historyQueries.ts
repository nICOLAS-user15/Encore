import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp, Workout } from '../../db/types'
import { listWorkoutSets } from '../workout/workoutQueries'

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

const isFinished = (workout: Workout) => isActive(workout) && workout.endedAt !== null

/**
 * Finished workouts with their sets, from newest to oldest; `limit` keeps only the
 * newest ones (the history screen loads pages). Sets are read only for the workouts
 * returned: that is the heavy part, which is why the list is paginated.
 */
export async function listWorkoutSummaries(
  db: EncoreDB,
  limit?: number,
): Promise<WorkoutSummary[]> {
  const newestFirst = db.workouts.orderBy('startedAt').reverse().filter(isFinished)
  const workouts = await (limit === undefined
    ? newestFirst.toArray()
    : newestFirst.limit(limit).toArray())
  return Promise.all(workouts.map((workout) => summarize(db, workout)))
}

/**
 * Finished workouts started in [from, to), with their sets, newest first. Read through
 * the `startedAt` index, so only that period is touched (this week, a month).
 */
export async function listWorkoutSummariesBetween(
  db: EncoreDB,
  from: Timestamp,
  to: Timestamp,
): Promise<WorkoutSummary[]> {
  const workouts = await listFinishedWorkoutsBetween(db, from, to)
  return Promise.all(workouts.map((workout) => summarize(db, workout)))
}

/** Finished workouts started in [from, to), newest first, without their sets. */
export async function listFinishedWorkoutsBetween(
  db: EncoreDB,
  from: Timestamp,
  to: Timestamp,
): Promise<Workout[]> {
  const workouts = await db.workouts
    .where('startedAt')
    .between(from, to)
    .filter(isFinished)
    .toArray()
  return workouts.reverse()
}

/**
 * When each finished workout started, newest first. Workout rows are small (the sets
 * live in another table), so reading all of them stays cheap after years of training:
 * it gives the total and the per-month counts of the history.
 */
export async function listFinishedWorkoutStarts(db: EncoreDB): Promise<Timestamp[]> {
  const workouts = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter(isFinished)
    .toArray()
  return workouts.map((workout) => workout.startedAt)
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
  // Walks back from this workout through the `startedAt` index: usually a few rows.
  const previous = await db.workouts
    .where('startedAt')
    .below(workout.startedAt)
    .reverse()
    .filter((other) => isFinished(other) && other.routineId === workout.routineId)
    .first()
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
