import type { ID, SetEntry, Workout } from '../../db/types'

/*
 * Pure functions (no database, no React) over the sets of a workout.
 * Pure = easy to test: same input, same output.
 */

export type ExerciseGroup = {
  exerciseId: ID
  sets: SetEntry[]
}

/**
 * Groups the sets by exercise. The order of the exercises is the order in which
 * each one first appears in the workout. Within each exercise, the
 * warm-ups come first (even if added later), and the rest keeps its order.
 */
export function groupSetsByExercise(sets: SetEntry[]): ExerciseGroup[] {
  const ordered = [...sets].sort((a, b) => a.position - b.position)
  const groups: ExerciseGroup[] = []
  const groupById = new Map<ID, ExerciseGroup>()

  for (const set of ordered) {
    let group = groupById.get(set.exerciseId)
    if (!group) {
      group = { exerciseId: set.exerciseId, sets: [] }
      groupById.set(set.exerciseId, group)
      groups.push(group)
    }
    group.sets.push(set)
  }

  for (const group of groups) {
    // sort is stable: among sets of the same type, the position order is kept.
    group.sets.sort((a, b) => Number(isWorkingSet(a)) - Number(isWorkingSet(b)))
  }
  return groups
}

/**
 * The next set to do ("where I am"): the first pending one AFTER the last
 * completed set (by timestamp). This way the highlight follows the user even if
 * they skip an exercise (busy machine); the skipped one comes back at the end, wrapping
 * around the list. With nothing completed, it is the first pending one. All done: `null`.
 */
export function nextPendingSetId(groups: ExerciseGroup[]): ID | null {
  const ordered = groups.flatMap((group) => group.sets)

  // Position of the last completed set (-1 = none yet).
  let lastIndex = -1
  let lastTime = Number.NEGATIVE_INFINITY
  ordered.forEach((set, index) => {
    if (set.completedAt !== null && set.completedAt > lastTime) {
      lastTime = set.completedAt
      lastIndex = index
    }
  })

  // Moves forward from it; the `%` (remainder) wraps back to the start of the list.
  for (let step = 1; step <= ordered.length; step++) {
    const set = ordered[(lastIndex + step) % ordered.length]
    if (!isCompleted(set)) {
      return set.id
    }
  }
  return null
}

export function isCompleted(set: SetEntry): boolean {
  return set.completedAt !== null
}

/**
 * Whether the user has really begun the workout: the timer was started or a set was
 * completed. Before that the workout is only OPEN (the user tapped a routine to look at
 * it): it is not "in progress" for the banner, the "Continuar" card or opening the app.
 */
export function hasWorkoutBegun(
  workout: Pick<Workout, 'timerStartedAt'>,
  sets: Array<Pick<SetEntry, 'completedAt'>>,
): boolean {
  return workout.timerStartedAt !== null || sets.some((set) => set.completedAt !== null)
}

/** "Working" set = everything that is not a warm-up. Only these count in the numbers. */
export function isWorkingSet(set: Pick<SetEntry, 'type'>): boolean {
  return set.type !== 'warmup'
}

/**
 * Number of each set within the exercise: 1, 2, 3... only for working sets;
 * warm-up gets `null` (the screen shows "AQ").
 */
export function numberSets(sets: SetEntry[]): Array<number | null> {
  let count = 0
  return sets.map((set) => (isWorkingSet(set) ? ++count : null))
}

/**
 * Suggested load for a warm-up: half of the first working set,
 * rounded down to multiples of 2.5 kg, with the same reps.
 */
export function warmupValues(sets: Array<Pick<SetEntry, 'type' | 'weightKg' | 'reps'>>): {
  weightKg: number
  reps: number
} {
  const firstWorking = sets.find(isWorkingSet)
  if (!firstWorking) {
    return { weightKg: 0, reps: 0 }
  }
  return {
    weightKg: Math.floor(firstWorking.weightKg / 2 / 2.5) * 2.5,
    reps: firstWorking.reps,
  }
}

/**
 * Next routine in the sequence: the one after the last trained
 * (wrapping to the start at the end of the list). With no history, suggests the first.
 */
export function suggestNextRoutineId(
  routineIds: ID[],
  lastRoutineId: ID | null,
): ID | null {
  if (routineIds.length === 0) {
    return null
  }
  // indexOf returns -1 if not found: -1 + 1 = 0, i.e. the first.
  const lastIndex = lastRoutineId === null ? -1 : routineIds.indexOf(lastRoutineId)
  return routineIds[(lastIndex + 1) % routineIds.length]
}

type WorkoutTimes = Pick<
  Workout,
  'startedAt' | 'endedAt' | 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'
>

/**
 * Time shown on the timer (0 if not started). Stopped or paused, the clock
 * freezes at the moment of "Parar"/"Pausar".
 */
export function timerElapsedMs(
  workout: Pick<Workout, 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'>,
  now: number,
): number {
  if (workout.timerStartedAt === null) {
    return 0
  }
  const end = workout.timerStoppedAt ?? workout.timerPausedAt ?? now
  return end - workout.timerStartedAt
}

/**
 * Workout duration for the history.
 * - With the timer: from "Iniciar" to "Parar" (or until finishing, if it was not stopped).
 * - Without the timer (the user never started it): from opening to finishing,
 *   as an estimate, to avoid showing "0 min".
 */
export function workoutDurationMs(workout: WorkoutTimes, now = Date.now()): number {
  if (workout.timerStartedAt !== null) {
    const end = workout.timerStoppedAt ?? workout.timerPausedAt ?? workout.endedAt ?? now
    return end - workout.timerStartedAt
  }
  return (workout.endedAt ?? now) - workout.startedAt
}

/** Completed working sets (what counts as "done" in the history). */
export function completedWorkingSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((set) => isCompleted(set) && isWorkingSet(set))
}

/** Volume = sum of load × reps of the completed working sets. */
export function totalVolumeKg(sets: SetEntry[]): number {
  return completedWorkingSets(sets).reduce(
    (total, set) => total + set.weightKg * set.reps,
    0,
  )
}

/**
 * What was done in the SAME set last time, for each set of today: the Nth normal set
 * pairs with last time's Nth normal set, the Nth encore with the Nth encore. Warm-up
 * pairs with nothing (it is not a target to beat). Sets with no counterpart are left out.
 */
export function previousSetsById<T extends Pick<SetEntry, 'id' | 'type'>>(
  sets: T[],
  lastSets: SetEntry[],
): Map<ID, SetEntry> {
  const result = new Map<ID, SetEntry>()
  for (const type of ['normal', 'encore'] as const) {
    const previous = lastSets.filter((set) => set.type === type)
    sets
      .filter((set) => set.type === type)
      .forEach((set, index) => {
        if (previous[index]) {
          result.set(set.id, previous[index])
        }
      })
  }
  return result
}

/** Longest exercise note kept (a line or two on a phone, not a diary page). */
export const MAX_EXERCISE_NOTE_LENGTH = 300

/** The day's note of an exercise in a workout (`''` = none; older workouts lack the map). */
export function exerciseNoteOf(
  workout: Pick<Workout, 'exerciseNotes'>,
  exerciseId: ID,
): string {
  return workout.exerciseNotes?.[exerciseId] ?? ''
}

/**
 * The notes map with this exercise's note replaced: trimmed, cut at the limit, and an
 * empty text removes the entry (no `''` left behind).
 */
export function withExerciseNote(
  notes: Record<ID, string> | undefined,
  exerciseId: ID,
  text: string,
): Record<ID, string> {
  const note = text.trim().slice(0, MAX_EXERCISE_NOTE_LENGTH).trim()
  const others = Object.entries(notes ?? {}).filter(([id]) => id !== exerciseId)
  return Object.fromEntries(note ? [...others, [exerciseId, note]] : others)
}
