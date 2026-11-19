import type { ID, Routine, Split, Workout } from '../../db/types'

/*
 * Regras puras sobre divisões de treino (sem banco, sem React): fáceis de testar.
 */

/**
 * Qual divisão está escolhida nas abas. Usa a que o usuário salvou; se ela não
 * existe mais (excluída, ou veio de outro aparelho), cai na primeira da lista.
 * Sem nenhuma divisão: `null`.
 */
export function resolveActiveSplit(
  splits: Split[],
  activeSplitId: ID | null,
): Split | null {
  return splits.find((split) => split.id === activeSplitId) ?? splits[0] ?? null
}

/**
 * As rotinas de uma divisão, mantendo a ordem em que vieram.
 *
 * Rotina "órfã" (aponta para uma divisão que não existe: foi excluída em outro
 * aparelho, por exemplo) aparece na PRIMEIRA divisão em vez de sumir da tela.
 */
export function routinesOfSplit<T extends { routine: Pick<Routine, 'splitId'> }>(
  entries: T[],
  splits: Split[],
  split: Split,
): T[] {
  const known = new Set(splits.map((item) => item.id))
  const isFirst = splits[0]?.id === split.id
  return entries.filter(
    (entry) =>
      entry.routine.splitId === split.id ||
      (isFirst && !known.has(entry.routine.splitId)),
  )
}

/**
 * A rotina do último treino finalizado DESTA divisão. É daí que sai o "próximo
 * da sequência": cada divisão guarda a sua própria sequência. Quem alterna entre
 * PPL e Upper/Lower não perde o ponto onde parou em nenhuma das duas.
 *
 * @param finishedNewestFirst treinos finalizados, do mais recente para o mais antigo
 */
export function lastRoutineIdInSplit(
  finishedNewestFirst: Array<Pick<Workout, 'routineId'>>,
  routineIdsInSplit: ID[],
): ID | null {
  const inSplit = new Set(routineIdsInSplit)
  const last = finishedNewestFirst.find(
    (workout) => workout.routineId !== null && inSplit.has(workout.routineId),
  )
  return last?.routineId ?? null
}
