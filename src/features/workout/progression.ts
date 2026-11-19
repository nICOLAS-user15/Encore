import type { SetEntry } from '../../db/types'

/*
 * Double progression: the classic method for training with a rep range
 * (e.g. 6–10).
 *
 * 1. With the same load, try to do more reps each workout.
 * 2. When ALL sets reach the top of the range (10, 10, 10), raise the load
 *    by the smallest available step and go back to the start of the range (6).
 *
 * Pure functions: the screen decides what to show, and the tests cover each case.
 */

export type LoadSuggestion = {
  /** `increase` = raise the load; `reps` = same load, aim for +1 rep. */
  kind: 'increase' | 'reps'
  weightKg: number
  reps: number
}

export type RepRange = { min: number; max: number }

type SetLike = Pick<SetEntry, 'type' | 'weightKg' | 'reps'>

/** Avoids floating-point noise (e.g. 0.1 + 0.2). */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Suggestion for today, based on the sets completed last time.
 *
 * @param lastSets sets from last time (warm-up already filtered out)
 * @param range rep range of the routine
 * @param stepKg smallest load step of the equipment; `null` = bodyweight,
 *   where progression is reps only (no range ceiling)
 * @returns `null` if there is no basis (no planned set from last time)
 */
export function suggestNextLoad(
  lastSets: SetLike[],
  range: RepRange,
  stepKg: number | null,
): LoadSuggestion | null {
  // Only the planned sets: the "encore" is extra and does not drive progression.
  const planned = lastSets.filter((set) => set.type === 'normal')
  if (planned.length === 0) {
    return null
  }

  // We look at the sets at the highest load (lighter back-off sets do not count).
  const topWeight = Math.max(...planned.map((set) => set.weightKg))
  const fewestReps = Math.min(
    ...planned.filter((set) => set.weightKg === topWeight).map((set) => set.reps),
  )

  if (stepKg === null) {
    return { kind: 'reps', weightKg: topWeight, reps: fewestReps + 1 }
  }
  if (fewestReps >= range.max) {
    return { kind: 'increase', weightKg: roundKg(topWeight + stepKg), reps: range.min }
  }
  return { kind: 'reps', weightKg: topWeight, reps: Math.min(fewestReps + 1, range.max) }
}

/** Planned sets not yet done: these are the ones "Aplicar" changes. */
export function pendingPlannedSets<T extends SetLike & Pick<SetEntry, 'completedAt'>>(
  sets: T[],
): T[] {
  return sets.filter((set) => set.type === 'normal' && set.completedAt === null)
}

/** Is the suggestion already in the pending sets? (then the "Aplicar" button disappears) */
export function isSuggestionApplied(
  sets: Array<SetLike & Pick<SetEntry, 'completedAt'>>,
  suggestion: Pick<LoadSuggestion, 'weightKg' | 'reps'>,
): boolean {
  return pendingPlannedSets(sets).every(
    (set) => set.weightKg === suggestion.weightKg && set.reps === suggestion.reps,
  )
}
