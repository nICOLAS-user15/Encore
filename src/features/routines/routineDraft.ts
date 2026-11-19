import type { ID, Routine, RoutineExercise } from '../../db/types'

/*
 * Draft of a routine: what the user is editing on screen BEFORE tapping
 * "Salvar". None of this goes to the database until Save (see saveRoutine).
 *
 * Pure functions (no database, no React): easy to test.
 */

/** An exercise of the routine inside the draft. */
export type DraftItem = {
  /** Stable on-screen key (React key): does not change when the list is reordered. */
  key: string
  /** Record id in the database. Absent = exercise just added, not saved yet. */
  id?: ID
  exerciseId: ID
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  referenceWeightKg: number | null
  referenceReps: number | null
  notes: string
  restSeconds: number | null
}

export type RoutineDraft = {
  name: string
  notes: string
  splitId: ID
  /** Desired position among the split's routines (0 = first). */
  position: number
  items: DraftItem[]
}

/** Default target for an exercise just added to a routine. */
export const DEFAULT_TARGET = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 }

/** Draft of a new routine: empty, at the end of the split. */
export function blankDraft(splitId: ID, routinesInSplit: number): RoutineDraft {
  return { name: '', notes: '', splitId, position: routinesInSplit, items: [] }
}

/** Draft of an existing routine (the starting point of the edit). */
export function draftFromRoutine(
  routine: Routine,
  items: RoutineExercise[],
  position: number,
): RoutineDraft {
  return {
    name: routine.name,
    notes: routine.notes,
    splitId: routine.splitId,
    position,
    items: items.map((item) => ({
      key: item.id,
      id: item.id,
      exerciseId: item.exerciseId,
      targetSets: item.targetSets,
      targetRepsMin: item.targetRepsMin,
      targetRepsMax: item.targetRepsMax,
      referenceWeightKg: item.referenceWeightKg,
      referenceReps: item.referenceReps,
      // Items saved before the field existed do not have it.
      notes: item.notes,
      restSeconds: item.restSeconds ?? null,
    })),
  }
}

/** A new exercise in the draft, with the default target (3 × 8–12). */
export function newDraftItem(exerciseId: ID): DraftItem {
  return {
    key: crypto.randomUUID(),
    exerciseId,
    ...DEFAULT_TARGET,
    referenceWeightKg: null,
    referenceReps: null,
    notes: '',
    restSeconds: null,
  }
}

/** Is there any difference between the draft and the starting point? */
export function isDraftDirty(draft: RoutineDraft, initial: RoutineDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(initial)
}

/** Swaps the exercise with its neighbor above (-1) or below (+1). */
export function moveDraftItem(
  items: DraftItem[],
  index: number,
  direction: -1 | 1,
): DraftItem[] {
  const target = index + direction
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items
  }
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Changes one field of an exercise, keeping the rep range consistent (min ≤ max). */
export function updateDraftItem(
  items: DraftItem[],
  key: string,
  changes: Partial<DraftItem>,
): DraftItem[] {
  return items.map((item) => {
    if (item.key !== key) {
      return item
    }
    const next = { ...item, ...changes }
    // The range is never inverted: raising the min pushes the max, and vice versa.
    if (changes.targetRepsMin !== undefined && next.targetRepsMin > next.targetRepsMax) {
      next.targetRepsMax = next.targetRepsMin
    }
    if (changes.targetRepsMax !== undefined && next.targetRepsMax < next.targetRepsMin) {
      next.targetRepsMin = next.targetRepsMax
    }
    return next
  })
}
