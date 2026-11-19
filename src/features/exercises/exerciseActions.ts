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
 * Procura um exercício ativo com este nome, em qualquer idioma, sem diferenciar
 * maiúsculas nem acentos ("supino RETO" acha "Supino reto").
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
 * Cria um exercício do usuário (`isCustom: true`) e o devolve. Ele passa a fazer
 * parte da biblioteca: aparece na aba Exercícios e em todo seletor.
 *
 * Se já existe um exercício com o mesmo nome, devolve o que existe em vez de criar
 * um repetido: quem digita "supino reto" sem reparar que ele já está na lista
 * não ganha um segundo "supino reto".
 *
 * O nome vale para os dois idiomas (o usuário digita em um só).
 */
export async function createCustomExercise(
  db: EncoreDB,
  input: NewExerciseInput,
): Promise<Exercise> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  // Dentro de uma transação: dois toques seguidos não criam dois registros.
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
