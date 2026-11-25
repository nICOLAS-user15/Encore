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

/** Weeks shown in the "sets per muscle" trend. */
export const TREND_WEEKS = 8
/** Full weeks averaged (the current one is still in progress, so it is left out). */
const AVERAGE_WEEKS = 4

export type MuscleTrend = {
  muscleGroup: MuscleGroup
  /** Completed working sets per week, oldest first; the last one is this week (so far). */
  sets: number[]
  /** Average sets per week over the last 4 FULL weeks (one decimal). */
  average: number
}

/** Monday 00:00 of each of the last `weeks` weeks, oldest first (the last is this week). */
export function weekStartsBack(now: Timestamp, weeks: number): Timestamp[] {
  const starts = [startOfWeek(now)]
  while (starts.length < weeks) {
    // One millisecond before a Monday is still last week: no DST arithmetic needed.
    starts.unshift(startOfWeek(starts[0] - 1))
  }
  return starts
}

/**
 * Sets per muscle group, week by week (bodyweight work counts like any set: here the
 * measure is sets, the usual hypertrophy reference of 10–20 per muscle per week).
 * Warm-up never counts. Groups with no sets in the whole window are left out; the rest
 * come most trained first.
 */
export function weeklySetsByMuscle(
  summaries: WorkoutSummary[],
  exercises: Map<ID, Pick<Exercise, 'muscleGroup'>>,
  now: Timestamp,
  weeks = TREND_WEEKS,
): MuscleTrend[] {
  const starts = weekStartsBack(now, weeks)
  const byMuscle = new Map<MuscleGroup, number[]>()

  for (const summary of summaries) {
    const week = starts.findLastIndex((start) => start <= summary.workout.startedAt)
    if (week === -1) {
      continue
    }
    for (const set of completedWorkingSets(summary.sets)) {
      const muscleGroup = exercises.get(set.exerciseId)?.muscleGroup
      if (!muscleGroup) {
        continue
      }
      const counts = byMuscle.get(muscleGroup) ?? Array.from({ length: weeks }, () => 0)
      counts[week]++
      byMuscle.set(muscleGroup, counts)
    }
  }

  return [...byMuscle.entries()]
    .map(([muscleGroup, sets]) => {
      const full = sets.slice(-1 - AVERAGE_WEEKS, -1)
      const average = full.reduce((sum, count) => sum + count, 0) / full.length
      return { muscleGroup, sets, average: Math.round(average * 10) / 10 }
    })
    .sort((a, b) => b.average - a.average || (b.sets.at(-1) ?? 0) - (a.sets.at(-1) ?? 0))
}
