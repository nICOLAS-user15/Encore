import type { ID, Timestamp } from '../../db/types'
import { estimateOneRepMax } from '../../lib/oneRepMax'
import {
  completedWorkingSets,
  totalVolumeKg,
  workoutDurationMs,
} from '../workout/workoutStats'
import type { WorkoutSummary } from './historyQueries'

/*
 * "Your month / your year": the numbers of a period, from its finished workouts.
 * Pure functions; the records count comes from reviewQueries (it needs the history
 * before the period).
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type PeriodReview = {
  workouts: number
  /** Sum of the workout durations. */
  durationMs: number
  /** Completed working sets. */
  sets: number
  volumeKg: number
  /** Workouts per week over the part of the period that already happened (one decimal). */
  perWeek: number
  /** The exercise whose best estimated 1RM grew the most from its first to its last session. */
  mostImproved: { exerciseId: ID; percent: number } | null
  /** The exercise done in the most workouts (more sets break a tie). */
  mostDone: { exerciseId: ID; sessions: number } | null
}

/** Best estimated 1RM per workout of each exercise, oldest workout first. */
function bestsByExercise(summaries: WorkoutSummary[]): Map<ID, number[]> {
  const result = new Map<ID, number[]>()
  const oldestFirst = [...summaries].sort(
    (a, b) => a.workout.startedAt - b.workout.startedAt,
  )
  for (const summary of oldestFirst) {
    const best = new Map<ID, number>()
    for (const set of completedWorkingSets(summary.sets)) {
      const oneRepMax = estimateOneRepMax(set.weightKg, set.reps)
      best.set(set.exerciseId, Math.max(best.get(set.exerciseId) ?? 0, oneRepMax))
    }
    for (const [exerciseId, oneRepMax] of best) {
      result.set(exerciseId, [...(result.get(exerciseId) ?? []), oneRepMax])
    }
  }
  return result
}

function mostImproved(summaries: WorkoutSummary[]): PeriodReview['mostImproved'] {
  let winner: PeriodReview['mostImproved'] = null
  for (const [exerciseId, bests] of bestsByExercise(summaries)) {
    const first = bests[0]
    const last = bests[bests.length - 1]
    // Needs two sessions with a load (bodyweight has no 1RM to compare).
    if (bests.length < 2 || first <= 0) {
      continue
    }
    const percent = Math.round(((last - first) / first) * 100)
    if (percent > 0 && (winner === null || percent > winner.percent)) {
      winner = { exerciseId, percent }
    }
  }
  return winner
}

function mostDone(summaries: WorkoutSummary[]): PeriodReview['mostDone'] {
  const sessions = new Map<ID, number>()
  const sets = new Map<ID, number>()
  for (const summary of summaries) {
    const done = completedWorkingSets(summary.sets)
    for (const exerciseId of new Set(done.map((set) => set.exerciseId))) {
      sessions.set(exerciseId, (sessions.get(exerciseId) ?? 0) + 1)
    }
    for (const set of done) {
      sets.set(set.exerciseId, (sets.get(set.exerciseId) ?? 0) + 1)
    }
  }
  let winner: PeriodReview['mostDone'] = null
  for (const [exerciseId, count] of sessions) {
    const better =
      winner === null ||
      count > winner.sessions ||
      (count === winner.sessions &&
        (sets.get(exerciseId) ?? 0) > (sets.get(winner.exerciseId) ?? 0))
    if (better) {
      winner = { exerciseId, sessions: count }
    }
  }
  return winner
}

/**
 * The review of a period [start, end) from its finished workouts. `now` cuts the
 * frequency: in the middle of a month, 6 workouts in 2 weeks is 3 a week, not 1.4.
 */
export function reviewOf(
  summaries: WorkoutSummary[],
  period: { start: Timestamp; end: Timestamp },
  now: Timestamp,
): PeriodReview {
  const elapsed = Math.max(0, Math.min(period.end, now) - period.start)
  const weeks = Math.max(1, elapsed / WEEK_MS)
  return {
    workouts: summaries.length,
    durationMs: summaries.reduce((sum, s) => sum + workoutDurationMs(s.workout), 0),
    sets: summaries.reduce((sum, s) => sum + completedWorkingSets(s.sets).length, 0),
    volumeKg: summaries.reduce((sum, s) => sum + totalVolumeKg(s.sets), 0),
    perWeek: Math.round((summaries.length / weeks) * 10) / 10,
    mostImproved: mostImproved(summaries),
    mostDone: mostDone(summaries),
  }
}
