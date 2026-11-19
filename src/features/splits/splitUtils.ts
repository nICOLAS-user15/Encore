import type { ID, Routine, Split, Workout } from '../../db/types'

/*
 * Pure rules about workout splits (no database, no React): easy to test.
 */

/**
 * Which split is selected in the tabs. Uses the one the user saved; if it no
 * longer exists (deleted, or came from another device), falls back to the first in the list.
 * With no splits: `null`.
 */
export function resolveActiveSplit(
  splits: Split[],
  activeSplitId: ID | null,
): Split | null {
  return splits.find((split) => split.id === activeSplitId) ?? splits[0] ?? null
}

/**
 * The routines of a split, keeping the order they came in.
 *
 * An "orphaned" routine (points to a split that does not exist: it was deleted on another
 * device, for example) shows in the FIRST split instead of vanishing from the screen.
 */
export function routinesOfSplit<T extends { routine: Pick<Routine, 'splitId'> }>(
  entries: T[],
  splits: Split[],
  split: Split,
): T[] {
  const known = new Set(splits.map((item) => item.id))
  const isFirst = splits[0]?.id === split.id
  return entries.filter(
    (entry) =>
      entry.routine.splitId === split.id ||
      (isFirst && !known.has(entry.routine.splitId)),
  )
}

/**
 * The routine of the last finished workout IN THIS split. This is where the "next in the
 * sequence" comes from: each split keeps its own sequence. Someone who alternates between
 * PPL and Upper/Lower does not lose their place in either one.
 *
 * @param finishedNewestFirst finished workouts, from newest to oldest
 */
export function lastRoutineIdInSplit(
  finishedNewestFirst: Array<Pick<Workout, 'routineId'>>,
  routineIdsInSplit: ID[],
): ID | null {
  const inSplit = new Set(routineIdsInSplit)
  const last = finishedNewestFirst.find(
    (workout) => workout.routineId !== null && inSplit.has(workout.routineId),
  )
  return last?.routineId ?? null
}
