import type { Exercise, ID, MuscleGroup, Timestamp } from '../../db/types'
import { completedWorkingSets } from '../workout/workoutStats'
import type { WorkoutSummary } from './historyQueries'

export type MuscleVolume = {
  muscleGroup: MuscleGroup
  /** Sum of load x reps of the completed working sets. */
  volumeKg: number
  /** Completed working sets (the only measure for bodyweight work). */
  sets: number
}

/** Monday 00:00 (local time) of the week that contains `timestamp`. Weeks start on Monday (ISO). */
export function startOfWeek(timestamp: Timestamp): Timestamp {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  // getDay(): 0 = Sunday ... 6 = Saturday. Days since Monday:
  const sinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - sinceMonday)
  return date.getTime()
}

/**
 * This week's work per muscle group, most volume first. Warm-up does not count
 * (same rule as the workout summary). Exercises missing from the map are skipped.
 */
export function weeklyVolumeByMuscle(
  summaries: WorkoutSummary[],
  exercises: Map<ID, Pick<Exercise, 'muscleGroup'>>,
  now: Timestamp,
): MuscleVolume[] {
  const weekStart = startOfWeek(now)
  const byMuscle = new Map<MuscleGroup, MuscleVolume>()

  for (const summary of summaries) {
    if (summary.workout.startedAt < weekStart) {
      continue
    }
    for (const set of completedWorkingSets(summary.sets)) {
      const muscleGroup = exercises.get(set.exerciseId)?.muscleGroup
      if (!muscleGroup) {
        continue
      }
      const entry = byMuscle.get(muscleGroup) ?? { muscleGroup, volumeKg: 0, sets: 0 }
      entry.volumeKg += set.weightKg * set.reps
      entry.sets++
      byMuscle.set(muscleGroup, entry)
    }
  }
  return [...byMuscle.values()].sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets)
}
