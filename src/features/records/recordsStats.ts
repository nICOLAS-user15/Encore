import type { ID, SetEntry } from '../../db/types'
import { estimateOneRepMax } from '../../lib/oneRepMax'
import { isWorkingSet } from '../workout/workoutStats'

/*
 * Personal records (PRs). Rules:
 * - only COMPLETED WORKING sets count (warm-up never does);
 * - a set is a record when it beats the best done BEFORE it, in heaviest load or in
 *   estimated 1RM (Epley), so 100 kg x 5 can be a record even if 105 kg x 1 was lifted;
 * - the very first time an exercise is done is not a record (there is nothing to beat);
 * - ties are not records;
 * - bodyweight sets (0 kg) have no load or 1RM to beat, so they never are.
 */

type RecordSet = Pick<SetEntry, 'id' | 'type' | 'weightKg' | 'reps' | 'completedAt'>

/** The best an exercise has reached. */
export type Best = {
  /** Heaviest load lifted in a working set. */
  weightKg: number
  /** Highest estimated 1RM. */
  oneRepMax: number
}

export type RecordKind = 'weight' | 'oneRepMax'

function counts(set: RecordSet): boolean {
  return set.completedAt !== null && isWorkingSet(set) && set.weightKg > 0 && set.reps > 0
}

/** Best load and best estimated 1RM among the sets that count; `null` if none counts. */
export function bestOf(sets: RecordSet[]): Best | null {
  let best: Best | null = null
  for (const set of sets) {
    if (counts(set)) {
      best = merge(best, set)
    }
  }
  return best
}

function merge(best: Best | null, set: RecordSet): Best {
  const oneRepMax = estimateOneRepMax(set.weightKg, set.reps)
  return {
    weightKg: Math.max(best?.weightKg ?? 0, set.weightKg),
    oneRepMax: Math.max(best?.oneRepMax ?? 0, oneRepMax),
  }
}

/** Whether `set` beats `previous` (and how). A heavier load wins over a better 1RM. */
export function recordKind(set: RecordSet, previous: Best | null): RecordKind | null {
  if (!counts(set) || previous === null) {
    return null
  }
  if (set.weightKg > previous.weightKg) {
    return 'weight'
  }
  if (estimateOneRepMax(set.weightKg, set.reps) > previous.oneRepMax) {
    return 'oneRepMax'
  }
  return null
}

/**
 * The sets of ONE exercise in one workout that are records, given the best from earlier
 * workouts. Sets are compared in order, each against everything before it: a second set
 * equal to a record that was just set is not a new record.
 */
export function recordSetIds(sets: RecordSet[], previous: Best | null): Set<ID> {
  const ids = new Set<ID>()
  // The first session ever only establishes the baseline: no records in it.
  if (previous === null) {
    return ids
  }
  let best: Best = previous
  for (const set of sets) {
    if (!counts(set)) {
      continue
    }
    if (recordKind(set, best) !== null) {
      ids.add(set.id)
    }
    best = merge(best, set)
  }
  return ids
}
