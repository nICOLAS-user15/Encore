import type { Equipment } from '../../db/types'

/*
 * Tipo do exercício, derivado do equipamento (não é guardado no banco):
 * - "free" (livres): barra, halteres, kettlebell e peso corporal;
 * - "machine" (máquinas): máquina e polia (a polia também é uma estação fixa).
 * Derivar em vez de guardar evita dois campos que podem discordar.
 */

export const EXERCISE_KINDS = ['free', 'machine'] as const
export type ExerciseKind = (typeof EXERCISE_KINDS)[number]

const MACHINE_EQUIPMENT: ReadonlySet<Equipment> = new Set(['machine', 'cable'])

export function exerciseKind(equipment: Equipment): ExerciseKind {
  return MACHINE_EQUIPMENT.has(equipment) ? 'machine' : 'free'
}
