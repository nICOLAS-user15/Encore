import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import {
  createRecord,
  isActive,
  restoreRecord,
  softDelete,
  updateRecord,
  updateRecordWith,
} from '../../db/repository'
import type { ID, SetEntry, SetType, Workout } from '../../db/types'
import { listRoutineExercises } from '../routines/routineQueries'
import {
  getActiveWorkout,
  getLastPerformance,
  listWorkoutSets,
  type LastPerformance,
} from './workoutQueries'
import { pendingPlannedSets } from './progression'
import {
  hasWorkoutBegun,
  isWorkingSet,
  warmupValues,
  withExerciseNote,
} from './workoutStats'

/*
 * Everything that WRITES during a workout. Each function saves right away: if the app
 * closes mid-workout, nothing is lost (a workout without `endedAt` stays active).
 */

type SetValues = Pick<SetEntry, 'weightKg' | 'reps'>

const EMPTY_VALUES: SetValues = { weightKg: 0, reps: 0 }

/**
 * Values for set number `index`: what was done in the same set
 * last time; if last time had fewer sets, repeats the last one;
 * with no history, uses the `fallback`.
 */
function pickValues(
  last: LastPerformance | null,
  index: number,
  fallback: SetValues,
): SetValues {
  // Extra (encore) sets from last time are not a template for the planned ones.
  const planned = last?.sets.filter((set) => set.type === 'normal') ?? []
  const source = planned[index] ?? planned.at(-1) ?? last?.sets.at(-1)
  return source ? { weightKg: source.weightKg, reps: source.reps } : fallback
}

/** Next free position in the workout (includes deleted sets, so it never repeats). */
async function nextPosition(db: EncoreDB, workoutId: ID): Promise<number> {
  const last = await db.setEntries
    .where('[workoutId+position]')
    .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
    .last()
  return last ? last.position + 1 : 0
}

function createSet(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  position: number,
  values: SetValues,
  type: SetType,
): Promise<SetEntry> {
  return createRecord(db.setEntries, {
    workoutId,
    exerciseId,
    position,
    weightKg: values.weightKg,
    reps: values.reps,
    type,
    completedAt: null,
  })
}

/**
 * Starts a workout (free with `routineId = null`, or from a routine).
 * If a workout is already in progress, returns it instead of creating another.
 * From a routine, it also creates the planned sets, pre-filled.
 */
export async function startWorkout(db: EncoreDB, routineId: ID | null): Promise<Workout> {
  return db.transaction(
    'rw',
    [db.workouts, db.setEntries, db.routineExercises, db.routines],
    async () => {
      const active = await getActiveWorkout(db)
      if (active) {
        return active
      }
      // Stale screen (routine deleted in another tab): does not create an orphan workout.
      if (routineId !== null) {
        const routine = await db.routines.get(routineId)
        if (!routine || !isActive(routine)) {
          throw new Error(`Routine ${routineId} not found`)
        }
      }

      const workout = await createRecord(db.workouts, {
        routineId,
        startedAt: Date.now(),
        endedAt: null,
        // The timer starts on "Iniciar cronômetro" or with the first completed set.
        timerStartedAt: null,
        timerStoppedAt: null,
        timerPausedAt: null,
        notes: '',
      })

      if (routineId !== null) {
        const items = await listRoutineExercises(db, routineId)
        let position = 0
        for (const item of items) {
          const last = await getLastPerformance(db, item.exerciseId, workout.id)
          const fallback: SetValues = {
            weightKg: item.referenceWeightKg ?? 0,
            reps: item.referenceReps ?? item.targetRepsMin,
          }
          for (let index = 0; index < item.targetSets; index++) {
            const values = pickValues(last, index, fallback)
            await createSet(db, workout.id, item.exerciseId, position, values, 'normal')
            position++
          }
        }
      }

      return workout
    },
  )
}

export type StartResult =
  | { status: 'started'; workout: Workout }
  /** Another workout is in progress WITH completed sets: the screen asks what to do. */
  | { status: 'blocked'; active: Workout }

/**
 * A workout that was only opened (not begun) is reopened as it is only within this
 * window: afterwards it is a leftover from another day, and reusing it would date the
 * new workout (history, duration, weekly volume) by the old opening.
 */
export const REOPEN_WINDOW_MS = 2 * 60 * 60 * 1000

/**
 * Start from the list (Workout or Routines tab), allowing a change of mind:
 * - same workout already open: continues it;
 * - open workout that has not begun (`hasWorkoutBegun`: no timer, no completed set),
 *   for another routine or opened more than `REOPEN_WINDOW_MS` ago: it is discarded,
 *   since there is nothing to lose, and a fresh one starts;
 * - another workout that has begun: touches nothing and returns `blocked`.
 */
export async function startOrSwitchWorkout(
  db: EncoreDB,
  routineId: ID | null,
): Promise<StartResult> {
  // A single transaction: the "has it begun?" check and the discard cannot be separated.
  return db.transaction(
    'rw',
    [db.workouts, db.setEntries, db.routineExercises, db.routines],
    async (): Promise<StartResult> => {
      const active = await getActiveWorkout(db)
      if (active) {
        const sameRoutine = active.routineId === routineId
        const begun = hasWorkoutBegun(active, await listWorkoutSets(db, active.id))
        if (begun && !sameRoutine) {
          return { status: 'blocked', active }
        }
        const stale = Date.now() - active.startedAt > REOPEN_WINDOW_MS
        if (!begun && (!sameRoutine || stale)) {
          await deleteWorkout(db, active.id)
        }
      }
      return { status: 'started', workout: await startWorkout(db, routineId) }
    },
  )
}

/** Adds an exercise to the workout (with one set, pre-filled from last time). */
export async function addExerciseToWorkout(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<SetEntry> {
  return db.transaction('rw', db.setEntries, async () => {
    const last = await getLastPerformance(db, exerciseId, workoutId)
    const position = await nextPosition(db, workoutId)
    return createSet(
      db,
      workoutId,
      exerciseId,
      position,
      pickValues(last, 0, EMPTY_VALUES),
      'normal',
    )
  })
}

/**
 * Adds one more set to an exercise, copying the load and reps of the
 * previous set. `type: 'encore'` marks the extra set, beyond the plan.
 */
export async function addSet(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  type: SetType,
): Promise<SetEntry> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = (await listWorkoutSets(db, workoutId)).filter(
      (set) => set.exerciseId === exerciseId,
    )
    // Warm-up: half the load of the first working set; normal/encore: a copy of the last one.
    const values = type === 'warmup' ? warmupValues(sets) : lastWorkingValues(sets)
    const position = await nextPosition(db, workoutId)
    return createSet(db, workoutId, exerciseId, position, values, type)
  })
}

/** Load and reps of the last WORKING set (not the warm-up), or zeros if there is none. */
function lastWorkingValues(sets: SetEntry[]): SetValues {
  const previous = sets.filter(isWorkingSet).at(-1)
  return previous ? { weightKg: previous.weightKg, reps: previous.reps } : EMPTY_VALUES
}

/**
 * "+ Série" on a FINISHED workout (history): a set the user did but forgot to log.
 * It copies the last working set of the exercise and is born completed.
 *
 * `completedAt` is the workout's `endedAt`, not "now": "last time" and records order sets
 * by `completedAt`, so a set stamped "now" would make an old workout look like the most
 * recent one and change what the next workout is pre-filled with.
 */
export async function addSetToFinishedWorkout(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<SetEntry> {
  return db.transaction('rw', [db.workouts, db.setEntries], async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout || !isActive(workout) || workout.endedAt === null) {
      throw new Error(`Workout ${workoutId} is not a finished workout`)
    }
    const sets = (await listWorkoutSets(db, workoutId)).filter(
      (set) => set.exerciseId === exerciseId,
    )
    const values = lastWorkingValues(sets)
    return createRecord(db.setEntries, {
      workoutId,
      exerciseId,
      position: await nextPosition(db, workoutId),
      weightKg: values.weightKg,
      reps: values.reps,
      type: 'normal',
      completedAt: workout.endedAt,
    })
  })
}

export async function updateSet(
  db: EncoreDB,
  setId: ID,
  changes: Partial<Pick<SetEntry, 'weightKg' | 'reps'>>,
): Promise<void> {
  await updateRecord(db.setEntries, setId, changes)
}

/**
 * "Aplicar" button of the load suggestion: writes load and reps to all the
 * planned sets still pending for this exercise. Warm-up, encore and
 * already completed sets stay as they are. Returns how many sets changed.
 */
export async function applyLoadSuggestion(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  values: SetValues,
): Promise<number> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = await listWorkoutSets(db, workoutId)
    const targets = pendingPlannedSets(
      sets.filter((set) => set.exerciseId === exerciseId),
    )
    for (const set of targets) {
      await updateRecord(db.setEntries, set.id, values)
    }
    return targets.length
  })
}

/**
 * After changing the load of a set, the planned sets still pending that had
 * the SAME old load follow the new one (60 → 65 kg on the 1st moves the others to 65).
 * Sets the user already adjusted by hand (different load) are not touched.
 * Returns how many sets changed.
 */
export async function followWeightChange(
  db: EncoreDB,
  set: Pick<SetEntry, 'id' | 'workoutId' | 'exerciseId' | 'type'>,
  fromKg: number,
  toKg: number,
): Promise<number> {
  if (set.type !== 'normal' || fromKg === toKg) {
    return 0
  }
  return db.transaction('rw', db.setEntries, async () => {
    const sets = await listWorkoutSets(db, set.workoutId)
    const followers = pendingPlannedSets(
      sets.filter((other) => other.exerciseId === set.exerciseId),
    ).filter((other) => other.id !== set.id && other.weightKg === fromKg)
    for (const follower of followers) {
      await updateRecord(db.setEntries, follower.id, { weightKg: toKg })
    }
    return followers.length
  })
}

/** Marks/unmarks the set as completed. Returns `true` if it ended up completed. */
export async function toggleSetCompleted(db: EncoreDB, setId: ID): Promise<boolean> {
  // Read and write in the same transaction: a double tap does not complete twice.
  let completed = false
  await updateRecordWith(db.setEntries, setId, (set) => {
    completed = set.completedAt === null
    return { completedAt: completed ? Date.now() : null }
  })
  return completed
}

/**
 * Puts the set in the state the user MEANT (`completed`), instead of flipping it. A double
 * tap on ✓ or on "Concluir série" sends the same intention twice: the second one changes
 * nothing. Returns `true` only if the set really changed.
 *
 * Completing a set also starts the workout timer if the user never tapped "Iniciar":
 * otherwise a forgotten tap would leave the duration as "from opening to finishing".
 * Un-completing never stops it.
 */
export async function setSetCompleted(
  db: EncoreDB,
  setId: ID,
  completed: boolean,
): Promise<boolean> {
  return db.transaction('rw', [db.setEntries, db.workouts], async () => {
    const set = await db.setEntries.get(setId)
    if (!set || !isActive(set) || (set.completedAt !== null) === completed) {
      return false
    }
    const now = Date.now()
    await updateRecord(db.setEntries, setId, { completedAt: completed ? now : null })
    if (completed) {
      const workout = await db.workouts.get(set.workoutId)
      if (workout && workout.endedAt === null && workout.timerStartedAt === null) {
        await updateRecord(db.workouts, workout.id, { timerStartedAt: now })
      }
    }
    return true
  })
}

/** Deletes a set (soft). Returns its id, for "Desfazer" (`restoreSets`). */
export async function deleteSet(db: EncoreDB, setId: ID): Promise<ID> {
  await softDelete(db.setEntries, setId)
  return setId
}

/**
 * Removes an exercise from the workout (soft-deletes all its sets in this workout).
 * Returns the deleted ids, for "Desfazer" (`restoreSets`).
 */
export async function removeExerciseFromWorkout(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<ID[]> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = (await listWorkoutSets(db, workoutId)).filter(
      (set) => set.exerciseId === exerciseId,
    )
    for (const set of sets) {
      await softDelete(db.setEntries, set.id)
    }
    return sets.map((set) => set.id)
  })
}

/** Undoes the deletion of sets ("Desfazer" button). */
export async function restoreSets(db: EncoreDB, setIds: ID[]): Promise<void> {
  await db.transaction('rw', db.setEntries, async () => {
    for (const id of setIds) {
      await restoreRecord(db.setEntries, id)
    }
  })
}

/**
 * Saves the day's note of an exercise in this workout (empty text removes it). Read and
 * write happen in one transaction, so saving one exercise's note never drops another's.
 */
export async function setExerciseNote(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  text: string,
): Promise<void> {
  await updateRecordWith(db.workouts, workoutId, (workout) => ({
    exerciseNotes: withExerciseNote(workout.exerciseNotes, exerciseId, text),
  }))
}

/** Turns on the workout timer (works only once: after starting, it does not restart). */
export async function startWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (workout && workout.timerStartedAt === null) {
    await updateRecord(db.workouts, workoutId, { timerStartedAt: Date.now() })
  }
}

/** Pauses the timer (if running): the clock freezes until resumed. */
export async function pauseWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (
    workout &&
    workout.timerStartedAt !== null &&
    workout.timerStoppedAt === null &&
    !workout.timerPausedAt
  ) {
    await updateRecord(db.workouts, workoutId, { timerPausedAt: Date.now() })
  }
}

/**
 * Resumes the paused timer. Advances `timerStartedAt` by the pause length, so
 * it does not count toward the duration (and the clock continues from where it stopped).
 */
export async function resumeWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (workout && workout.timerStartedAt !== null && workout.timerPausedAt) {
    await updateRecord(db.workouts, workoutId, {
      timerStartedAt: workout.timerStartedAt + (Date.now() - workout.timerPausedAt),
      timerPausedAt: null,
    })
  }
}

/**
 * Soft-deletes the workout and all its sets (discard or delete from the history).
 * Returns the ids of the deleted sets, for "Desfazer" (`restoreWorkout`).
 */
export async function deleteWorkout(db: EncoreDB, workoutId: ID): Promise<ID[]> {
  return db.transaction('rw', [db.workouts, db.setEntries], async () => {
    const sets = await listWorkoutSets(db, workoutId)
    for (const set of sets) {
      await softDelete(db.setEntries, set.id)
    }
    await softDelete(db.workouts, workoutId)
    return sets.map((set) => set.id)
  })
}

/** Undoes `deleteWorkout`: the workout and the sets it deleted come back. */
export async function restoreWorkout(
  db: EncoreDB,
  workoutId: ID,
  setIds: ID[],
): Promise<void> {
  await db.transaction('rw', [db.workouts, db.setEntries], async () => {
    await restoreRecord(db.workouts, workoutId)
    for (const id of setIds) {
      await restoreRecord(db.setEntries, id)
    }
  })
}

/**
 * Finishes the workout: discards the uncompleted sets and writes `endedAt`.
 * With no completed set there is nothing to save: the workout is discarded.
 */
export async function finishWorkout(
  db: EncoreDB,
  workoutId: ID,
): Promise<'finished' | 'discarded'> {
  return db.transaction('rw', [db.workouts, db.setEntries], async () => {
    // Second tap on "Finalizar" (or another tab): already finished, does not touch `endedAt`.
    const existing = await db.workouts.get(workoutId)
    if (existing?.endedAt != null) {
      return 'finished'
    }
    const sets = await listWorkoutSets(db, workoutId)
    const completed = sets.filter((set) => set.completedAt !== null)
    if (completed.length === 0) {
      await deleteWorkout(db, workoutId)
      return 'discarded'
    }

    for (const set of sets) {
      if (set.completedAt === null) {
        await softDelete(db.setEntries, set.id)
      }
    }
    // Finishing also stops the timer, if it is still running or paused
    // (paused: the time stops at the moment of the pause, not at the finish).
    const workout = await db.workouts.get(workoutId)
    const timerRunning =
      workout !== undefined &&
      workout.timerStartedAt !== null &&
      workout.timerStoppedAt === null
    const now = Date.now()
    await updateRecord(
      db.workouts,
      workoutId,
      timerRunning
        ? {
            endedAt: now,
            timerStoppedAt: workout.timerPausedAt ?? now,
            timerPausedAt: null,
          }
        : { endedAt: now },
    )
    return 'finished'
  })
}
