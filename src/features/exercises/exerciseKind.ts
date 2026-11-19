import type { Equipment } from '../../db/types'

/*
 * Exercise type, derived from the equipment (not stored in the database):
 * - "free" (livres): barbell, dumbbells, kettlebell and bodyweight;
 * - "machine" (máquinas): machine and cable (the cable is also a fixed station).
 * Deriving instead of storing avoids two fields that can disagree.
 */

export const EXERCISE_KINDS = ['free', 'machine'] as const
export type ExerciseKind = (typeof EXERCISE_KINDS)[number]

const MACHINE_EQUIPMENT: ReadonlySet<Equipment> = new Set(['machine', 'cable'])

export function exerciseKind(equipment: Equipment): ExerciseKind {
  return MACHINE_EQUIPMENT.has(equipment) ? 'machine' : 'free'
}
