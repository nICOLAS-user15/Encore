import type { EncoreDB } from '../../db/db'
import { createRecord, isActive } from '../../db/repository'
import {
  LANGUAGES,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '../../db/types'
import { nameKey } from '../../lib/text'

export type NewExerciseInput = {
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
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
