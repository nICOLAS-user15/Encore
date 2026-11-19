import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp, Workout } from '../../db/types'
import { estimateOneRepMax } from '../../lib/oneRepMax'
import { isWorkingSet } from '../workout/workoutStats'

/** One workout in an exercise's history: what was the best done that day. */
export type ExerciseSession = {
  workoutId: ID
  /** When the workout started. */
  date: Timestamp
  /** Heaviest working set (more reps break a tie). */
  topSet: { weightKg: number; reps: number }
  /** Best estimated 1RM of the session (Epley). */
  oneRepMax: number
  /** Most reps in a single set (what matters for bodyweight exercises). */
  maxReps: number
  /** Completed working sets. */
  sets: number
}

/**
 * Pure part: groups the completed working sets of ONE exercise into sessions, one per
 * finished workout, oldest first. Sets of workouts that are not in `workouts` (deleted
 * or still in progress) are ignored.
 */
export function toSessions(
  sets: SetEntry[],
  workouts: Map<ID, Pick<Workout, 'startedAt'>>,
): ExerciseSession[] {
  const sessions = new Map<ID, ExerciseSession>()
  for (const set of sets) {
    const workout = workouts.get(set.workoutId)
    if (!workout || set.completedAt === null || !isWorkingSet(set)) {
      continue
    }
    const session = sessions.get(set.workoutId) ?? {
      workoutId: set.workoutId,
      date: workout.startedAt,
      topSet: { weightKg: set.weightKg, reps: set.reps },
      oneRepMax: 0,
      maxReps: 0,
      sets: 0,
    }
    const heavier =
      set.weightKg > session.topSet.weightKg ||
      (set.weightKg === session.topSet.weightKg && set.reps > session.topSet.reps)
    if (heavier) {
      session.topSet = { weightKg: set.weightKg, reps: set.reps }
    }
    session.oneRepMax = Math.max(
      session.oneRepMax,
      estimateOneRepMax(set.weightKg, set.reps),
    )
    session.maxReps = Math.max(session.maxReps, set.reps)
    session.sets++
    sessions.set(set.workoutId, session)
  }
  return [...sessions.values()].sort((a, b) => a.date - b.date)
}

/** Every finished workout that has this exercise, oldest first (exercise detail screen). */
export async function listExerciseSessions(
  db: EncoreDB,
  exerciseId: ID,
): Promise<ExerciseSession[]> {
  // [exerciseId+completedAt]: only this exercise's completed sets, straight from the index.
  const sets = await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .filter(isActive)
    .toArray()
  const workoutIds = [...new Set(sets.map((set) => set.workoutId))]
  const workouts = await db.workouts.bulkGet(workoutIds)
  const finished = new Map(
    workouts
      .filter(
        (workout): workout is Workout =>
          workout !== undefined && isActive(workout) && workout.endedAt !== null,
      )
      .map((workout) => [workout.id, workout]),
  )
  return toSessions(sets, finished)
}
