import type { ID, SetEntry, Workout } from '../../db/types'

/*
 * Funções puras (sem banco, sem React) sobre as séries de um treino.
 * Puras = fáceis de testar: mesma entrada, mesma saída.
 */

export type ExerciseGroup = {
  exerciseId: ID
  sets: SetEntry[]
}

/**
 * Agrupa as séries por exercício. A ordem dos exercícios é a ordem em que
 * cada um aparece pela primeira vez no treino. Dentro de cada exercício, os
 * aquecimentos vêm primeiro (mesmo se adicionados depois), e o resto segue a ordem.
 */
export function groupSetsByExercise(sets: SetEntry[]): ExerciseGroup[] {
  const ordered = [...sets].sort((a, b) => a.position - b.position)
  const groups: ExerciseGroup[] = []
  const groupById = new Map<ID, ExerciseGroup>()

  for (const set of ordered) {
    let group = groupById.get(set.exerciseId)
    if (!group) {
      group = { exerciseId: set.exerciseId, sets: [] }
      groupById.set(set.exerciseId, group)
      groups.push(group)
    }
    group.sets.push(set)
  }

  for (const group of groups) {
    // sort é estável: entre séries do mesmo tipo, a ordem por posição se mantém.
    group.sets.sort((a, b) => Number(isWorkingSet(a)) - Number(isWorkingSet(b)))
  }
  return groups
}

/**
 * A próxima série a fazer ("onde estou"): a primeira pendente DEPOIS da última
 * série concluída (pelo horário). Assim o destaque acompanha o usuário mesmo se
 * ele pular um exercício (máquina ocupada); o pulado volta no fim, dando a volta
 * na lista. Sem nada concluído, é a primeira pendente. Tudo feito: `null`.
 */
export function nextPendingSetId(groups: ExerciseGroup[]): ID | null {
  const ordered = groups.flatMap((group) => group.sets)

  // Posição da última série concluída (-1 = nenhuma ainda).
  let lastIndex = -1
  let lastTime = Number.NEGATIVE_INFINITY
  ordered.forEach((set, index) => {
    if (set.completedAt !== null && set.completedAt > lastTime) {
      lastTime = set.completedAt
      lastIndex = index
    }
  })

  // Anda para a frente a partir dela; o `%` (resto) faz voltar ao início da lista.
  for (let step = 1; step <= ordered.length; step++) {
    const set = ordered[(lastIndex + step) % ordered.length]
    if (!isCompleted(set)) {
      return set.id
    }
  }
  return null
}

export function isCompleted(set: SetEntry): boolean {
  return set.completedAt !== null
}

/** Série "de trabalho" = tudo que não é aquecimento. Só elas contam nos números. */
export function isWorkingSet(set: Pick<SetEntry, 'type'>): boolean {
  return set.type !== 'warmup'
}

/**
 * Número de cada série dentro do exercício: 1, 2, 3... só para as de trabalho;
 * aquecimento recebe `null` (a tela mostra "AQ").
 */
export function numberSets(sets: SetEntry[]): Array<number | null> {
  let count = 0
  return sets.map((set) => (isWorkingSet(set) ? ++count : null))
}

/**
 * Carga sugerida para um aquecimento: metade da primeira série de trabalho,
 * arredondada para baixo em múltiplos de 2,5 kg, com as mesmas repetições.
 */
export function warmupValues(sets: Array<Pick<SetEntry, 'type' | 'weightKg' | 'reps'>>): {
  weightKg: number
  reps: number
} {
  const firstWorking = sets.find(isWorkingSet)
  if (!firstWorking) {
    return { weightKg: 0, reps: 0 }
  }
  return {
    weightKg: Math.floor(firstWorking.weightKg / 2 / 2.5) * 2.5,
    reps: firstWorking.reps,
  }
}

/**
 * Próxima rotina da sequência: a que vem depois da última treinada
 * (voltando ao início no fim da lista). Sem histórico, sugere a primeira.
 */
export function suggestNextRoutineId(
  routineIds: ID[],
  lastRoutineId: ID | null,
): ID | null {
  if (routineIds.length === 0) {
    return null
  }
  // indexOf devolve -1 se não achar: -1 + 1 = 0, ou seja, a primeira.
  const lastIndex = lastRoutineId === null ? -1 : routineIds.indexOf(lastRoutineId)
  return routineIds[(lastIndex + 1) % routineIds.length]
}

type WorkoutTimes = Pick<
  Workout,
  'startedAt' | 'endedAt' | 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'
>

/**
 * Tempo mostrado no cronômetro (0 se não iniciou). Parado ou pausado, o relógio
 * congela no instante do "Parar"/"Pausar".
 */
export function timerElapsedMs(
  workout: Pick<Workout, 'timerStartedAt' | 'timerStoppedAt' | 'timerPausedAt'>,
  now: number,
): number {
  if (workout.timerStartedAt === null) {
    return 0
  }
  const end = workout.timerStoppedAt ?? workout.timerPausedAt ?? now
  return end - workout.timerStartedAt
}

/**
 * Duração do treino para o histórico.
 * - Com cronômetro: do "Iniciar" até o "Parar" (ou até finalizar, se não parou).
 * - Sem cronômetro (o usuário nunca iniciou): da abertura até a finalização,
 *   como estimativa, para não mostrar "0 min".
 */
export function workoutDurationMs(workout: WorkoutTimes, now = Date.now()): number {
  if (workout.timerStartedAt !== null) {
    const end = workout.timerStoppedAt ?? workout.timerPausedAt ?? workout.endedAt ?? now
    return end - workout.timerStartedAt
  }
  return (workout.endedAt ?? now) - workout.startedAt
}

/** Séries de trabalho concluídas (o que conta como "feito" no histórico). */
export function completedWorkingSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((set) => isCompleted(set) && isWorkingSet(set))
}

/** Volume = soma de carga × repetições das séries de trabalho concluídas. */
export function totalVolumeKg(sets: SetEntry[]): number {
  return completedWorkingSets(sets).reduce(
    (total, set) => total + set.weightKg * set.reps,
    0,
  )
}
