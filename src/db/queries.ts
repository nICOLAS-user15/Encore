import type { EncoreDB } from './db'
import { isActive } from './repository'
import type { Exercise, Language } from './types'

/** Exercícios não excluídos, em ordem alfabética no idioma escolhido (respeitando acentos). */
export async function listActiveExercises(
  db: EncoreDB,
  language: Language = 'pt',
): Promise<Exercise[]> {
  const exercises = await db.exercises.filter(isActive).toArray()
  return exercises.sort((a, b) =>
    a.names[language].localeCompare(b.names[language], language),
  )
}
