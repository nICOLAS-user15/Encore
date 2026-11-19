import type { SetEntry, Workout } from '../../db/types'
import {
  completedWorkingSets,
  totalVolumeKg,
  workoutDurationMs,
} from '../workout/workoutStats'

/*
 * Comparison of a workout with the previous time of the same routine: the "how did I do today?"
 * of the post-workout. Pure function: the screen only formats the numbers.
 */

type Comparable = {
  workout: Pick<
    Workout,
    'startedAt' | 'endedAt' | 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'
  >
  sets: SetEntry[]
}

export type WorkoutComparison = {
  /** Today's volume minus the previous time's (kg). Positive = more volume. */
  volumeKg: number
  /** Completed working sets: today minus the previous time. */
  sets: number
  /** Duration: today minus the previous time, in whole minutes. Negative = faster. */
  durationMin: number
}

export function compareWorkouts(
  today: Comparable,
  previous: Comparable,
): WorkoutComparison {
  const minutes = (item: Comparable) =>
    Math.round(workoutDurationMs(item.workout) / 60_000)
  return {
    volumeKg: totalVolumeKg(today.sets) - totalVolumeKg(previous.sets),
    sets:
      completedWorkingSets(today.sets).length -
      completedWorkingSets(previous.sets).length,
    durationMin: minutes(today) - minutes(previous),
  }
}
