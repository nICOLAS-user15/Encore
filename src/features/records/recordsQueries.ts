import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { ID, SetEntry, Timestamp } from '../../db/types'
import { groupSetsByExercise } from '../workout/workoutStats'
import { bestOf, recordSetIds, type Best } from './recordsStats'

/** The workout whose sets are being judged: only what came BEFORE it counts. */
type Reference = { workoutId: ID; startedAt: Timestamp }

/**
 * Best load and estimated 1RM of an exercise before a given workout. Reads the
 * `[exerciseId+completedAt]` index only up to the workout's start, so later workouts
 * (when looking at an old one in the history) do not count. `null` = never done before.
 */
export async function getExerciseBest(
  db: EncoreDB,
  exerciseId: ID,
  before: Reference,
): Promise<Best | null> {
  const sets = await db.setEntries
    .where('[exerciseId+completedAt]')
    // Upper bound included: a set finished in the same millisecond the workout started still
    // counts as earlier (the workout's own sets are excluded by id just below).
    .between([exerciseId, Dexie.minKey], [exerciseId, before.startedAt], true, true)
    .filter((set) => isActive(set) && set.workoutId !== before.workoutId)
    .toArray()
  return bestOf(sets)
}

/** Ids of the sets of a workout that are personal records (for the history detail). */
export async function getWorkoutRecordIds(
  db: EncoreDB,
  workout: Reference,
  sets: SetEntry[],
): Promise<Set<ID>> {
  const ids = new Set<ID>()
  for (const group of groupSetsByExercise(sets)) {
    const best = await getExerciseBest(db, group.exerciseId, workout)
    for (const id of recordSetIds(group.sets, best)) {
      ids.add(id)
    }
  }
  return ids
}
