import type { EncoreDB } from '../../db/db'
import { createRecord, isActive, softDelete, updateRecord } from '../../db/repository'
import {
  LANGUAGES,
  type Equipment,
  type ID,
  type Exercise,
  type MuscleGroup,
  type Routine,
} from '../../db/types'
import { nameKey } from '../../lib/text'

export type NewExerciseInput = {
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
}

/** Trims and collapses spaces: "  supino   reto " → "supino reto". */
function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Looks for an active exercise with this name, in any language, ignoring
 * case and accents ("supino RETO" finds "Supino reto").
 */
export async function findExerciseByName(
  db: EncoreDB,
  name: string,
): Promise<Exercise | undefined> {
  const key = nameKey(name)
  const exercises = await db.exercises.filter(isActive).toArray()
  return exercises.find((exercise) =>
    LANGUAGES.some((language) => nameKey(exercise.names[language]) === key),
  )
}

/**
 * Creates a user exercise (`isCustom: true`) and returns it. It becomes part
 * of the library: it shows in the Exercícios tab and in every picker.
 *
 * If an exercise with the same name already exists, returns the existing one instead of creating
 * a duplicate: someone who types "supino reto" without noticing it is already in the list
 * does not get a second "supino reto".
 *
 * The name applies to both languages (the user types in only one).
 */
export async function createCustomExercise(
  db: EncoreDB,
  input: NewExerciseInput,
): Promise<Exercise> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  // Inside a transaction: two quick taps do not create two records.
  return db.transaction('rw', db.exercises, async () => {
    const existing = await findExerciseByName(db, name)
    if (existing) {
      return existing
    }
    return createRecord(db.exercises, {
      names: { pt: name, en: name },
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
      isCustom: true,
    })
  })
}

/**
 * Edits a user exercise (name, muscle group, equipment). The name again applies to both
 * languages. Refuses (`nameTaken`) a name that another active exercise already has, in
 * any language: two exercises with the same name could not be told apart in a picker.
 * Library exercises are not editable (`notCustom`): the seed sync recognizes them by name.
 */
export async function updateCustomExercise(
  db: EncoreDB,
  exerciseId: ID,
  input: NewExerciseInput,
): Promise<'saved' | 'nameTaken' | 'notCustom'> {
  const name = cleanName(input.name)
  return db.transaction('rw', db.exercises, async () => {
    const exercise = await db.exercises.get(exerciseId)
    if (!exercise?.isCustom) {
      return 'notCustom'
    }
    const sameName = await findExerciseByName(db, name)
    if (sameName && sameName.id !== exerciseId) {
      return 'nameTaken'
    }
    await updateRecord(db.exercises, exerciseId, {
      names: { pt: name, en: name },
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
    })
    return 'saved'
  })
}

/** Names of the active routines that use this exercise (in routine order). */
export async function routinesUsingExercise(
  db: EncoreDB,
  exerciseId: ID,
): Promise<string[]> {
  const items = await db.routineExercises
    .where('exerciseId')
    .equals(exerciseId)
    .filter(isActive)
    .toArray()
  const routines = await db.routines.bulkGet([
    ...new Set(items.map((item) => item.routineId)),
  ])
  return routines
    .filter((routine): routine is Routine => routine !== undefined && isActive(routine))
    .sort((a, b) => a.order - b.order)
    .map((routine) => routine.name)
}

export type DeleteExerciseResult =
  | { kind: 'deleted' }
  /** Still in these routines: remove it there first (no routine is left broken). */
  | { kind: 'inUse'; routines: string[] }
  | { kind: 'notCustom' }

/**
 * Soft-deletes a user exercise. It leaves the library and the pickers; the history keeps
 * its sets and its name (the exercise map includes deleted rows). Undo = `restoreRecord`.
 */
export async function deleteCustomExercise(
  db: EncoreDB,
  exerciseId: ID,
): Promise<DeleteExerciseResult> {
  return db.transaction(
    'rw',
    [db.exercises, db.routineExercises, db.routines],
    async () => {
      const exercise = await db.exercises.get(exerciseId)
      if (!exercise?.isCustom) {
        return { kind: 'notCustom' }
      }
      const routines = await routinesUsingExercise(db, exerciseId)
      if (routines.length > 0) {
        return { kind: 'inUse', routines }
      }
      await softDelete(db.exercises, exerciseId)
      return { kind: 'deleted' }
    },
  )
}
