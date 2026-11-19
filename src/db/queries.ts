import type { EncoreDB } from './db'
import { isActive } from './repository'
import type { Exercise, Language } from './types'

/** Non-deleted exercises, in alphabetical order in the chosen language (respecting accents). */
export async function listActiveExercises(
  db: EncoreDB,
  language: Language = 'pt',
): Promise<Exercise[]> {
  const exercises = await db.exercises.filter(isActive).toArray()
  return exercises.sort((a, b) =>
    a.names[language].localeCompare(b.names[language], language),
  )
}
