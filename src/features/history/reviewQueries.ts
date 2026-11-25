import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp } from '../../db/types'
import { bestOf, recordSetIds, type Best } from '../records/recordsStats'
import { listWorkoutSummariesBetween, type WorkoutSummary } from './historyQueries'

/**
 * Personal records set in the period's workouts, with the same rules as the workout
 * screen: each set against everything before it. One index read per exercise of the
 * period (its history up to the period's end), not one per workout.
 */
async function countRecords(
  db: EncoreDB,
  summaries: WorkoutSummary[],
  end: Timestamp,
): Promise<number> {
  const inPeriod = new Set(summaries.map((summary) => summary.workout.id))
  const exerciseIds = new Set(
    summaries.flatMap((s) => s.sets.map((set) => set.exerciseId)),
  )
  let records = 0

  for (const exerciseId of exerciseIds) {
    // Index order = completedAt order: the history of this exercise, oldest first.
    const sets = await db.setEntries
      .where('[exerciseId+completedAt]')
      .between([exerciseId, Dexie.minKey], [exerciseId, end])
      .filter(isActive)
      .toArray()

    let best = null as Best | null
    const byWorkout = new Map<ID, SetEntry[]>()
    for (const set of sets) {
      byWorkout.set(set.workoutId, [...(byWorkout.get(set.workoutId) ?? []), set])
    }
    for (const [workoutId, workoutSets] of byWorkout) {
      if (inPeriod.has(workoutId)) {
        records += recordSetIds(workoutSets, best).size
      }
      const workoutBest = bestOf(workoutSets)
      if (workoutBest) {
        best = {
          weightKg: Math.max(best?.weightKg ?? 0, workoutBest.weightKg),
          oneRepMax: Math.max(best?.oneRepMax ?? 0, workoutBest.oneRepMax),
        }
      }
    }
  }
  return records
}

/** The period's finished workouts (with sets) and how many records they set. */
export async function getPeriodWorkouts(
  db: EncoreDB,
  start: Timestamp,
  end: Timestamp,
): Promise<{ summaries: WorkoutSummary[]; records: number }> {
  const summaries = await listWorkoutSummariesBetween(db, start, end)
  return { summaries, records: await countRecords(db, summaries, end) }
}
