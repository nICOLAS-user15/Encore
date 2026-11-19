import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Exercise, ID } from '../../db/types'

/**
 * Todos os exercícios (inclusive excluídos) num Map id -> exercício.
 * Inclui os excluídos porque o histórico precisa mostrar o nome de um
 * exercício mesmo depois que ele foi apagado da biblioteca.
 * `undefined` enquanto carrega.
 */
export function useExerciseMap(): Map<ID, Exercise> | undefined {
  return useLiveQuery(async () => {
    const exercises = await db.exercises.toArray()
    return new Map(exercises.map((exercise) => [exercise.id, exercise]))
  }, [])
}
