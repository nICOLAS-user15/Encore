import type { SetEntry, Workout } from '../../db/types'
import {
  completedWorkingSets,
  totalVolumeKg,
  workoutDurationMs,
} from '../workout/workoutStats'

/*
 * Comparação de um treino com a vez anterior da mesma rotina: o "como fui hoje?"
 * do pós-treino. Função pura: a tela só formata os números.
 */

type Comparable = {
  workout: Pick<
    Workout,
    'startedAt' | 'endedAt' | 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'
  >
  sets: SetEntry[]
}

export type WorkoutComparison = {
  /** Volume de hoje menos o da vez anterior (kg). Positivo = mais volume. */
  volumeKg: number
  /** Séries de trabalho concluídas: hoje menos a vez anterior. */
  sets: number
  /** Duração: hoje menos a vez anterior, em minutos inteiros. Negativo = mais rápido. */
  durationMin: number
}

export function compareWorkouts(
  today: Comparable,
  previous: Comparable,
): WorkoutComparison {
  const minutes = (item: Comparable) =>
    Math.round(workoutDurationMs(item.workout) / 60_000)
  return {
    volumeKg: totalVolumeKg(today.sets) - totalVolumeKg(previous.sets),
    sets:
      completedWorkingSets(today.sets).length -
      completedWorkingSets(previous.sets).length,
    durationMin: minutes(today) - minutes(previous),
  }
}
