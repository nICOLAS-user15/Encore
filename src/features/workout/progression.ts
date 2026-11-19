import type { SetEntry } from '../../db/types'

/*
 * Progressão dupla: o método clássico para quem treina com faixa de repetições
 * (ex.: 6–10).
 *
 * 1. Com a mesma carga, tente fazer mais repetições a cada treino.
 * 2. Quando TODAS as séries chegarem ao topo da faixa (10, 10, 10), suba a carga
 *    pelo menor salto disponível e volte para o começo da faixa (6).
 *
 * Funções puras: a tela decide o que mostrar, e os testes cobrem cada caso.
 */

export type LoadSuggestion = {
  /** `increase` = subir a carga; `reps` = mesma carga, buscar +1 repetição. */
  kind: 'increase' | 'reps'
  weightKg: number
  reps: number
}

export type RepRange = { min: number; max: number }

type SetLike = Pick<SetEntry, 'type' | 'weightKg' | 'reps'>

/** Evita lixo de ponto flutuante (ex.: 0.1 + 0.2). */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Sugestão para hoje, a partir das séries concluídas da última vez.
 *
 * @param lastSets séries da última vez (o aquecimento já vem filtrado)
 * @param range faixa de repetições da rotina
 * @param stepKg menor salto de carga do equipamento; `null` = peso corporal,
 *   em que a progressão é só em repetições (sem teto de faixa)
 * @returns `null` se não há base (nenhuma série planejada da última vez)
 */
export function suggestNextLoad(
  lastSets: SetLike[],
  range: RepRange,
  stepKg: number | null,
): LoadSuggestion | null {
  // Só as séries planejadas: o "encore" é extra e não define a progressão.
  const planned = lastSets.filter((set) => set.type === 'normal')
  if (planned.length === 0) {
    return null
  }

  // Olhamos as séries na carga mais alta (séries de recuo mais leves não contam).
  const topWeight = Math.max(...planned.map((set) => set.weightKg))
  const fewestReps = Math.min(
    ...planned.filter((set) => set.weightKg === topWeight).map((set) => set.reps),
  )

  if (stepKg === null) {
    return { kind: 'reps', weightKg: topWeight, reps: fewestReps + 1 }
  }
  if (fewestReps >= range.max) {
    return { kind: 'increase', weightKg: roundKg(topWeight + stepKg), reps: range.min }
  }
  return { kind: 'reps', weightKg: topWeight, reps: Math.min(fewestReps + 1, range.max) }
}

/** Séries planejadas ainda não feitas: são elas que o "Aplicar" muda. */
export function pendingPlannedSets<T extends SetLike & Pick<SetEntry, 'completedAt'>>(
  sets: T[],
): T[] {
  return sets.filter((set) => set.type === 'normal' && set.completedAt === null)
}

/** A sugestão já está nas séries pendentes? (aí o botão "Aplicar" some) */
export function isSuggestionApplied(
  sets: Array<SetLike & Pick<SetEntry, 'completedAt'>>,
  suggestion: Pick<LoadSuggestion, 'weightKg' | 'reps'>,
): boolean {
  return pendingPlannedSets(sets).every(
    (set) => set.weightKg === suggestion.weightKg && set.reps === suggestion.reps,
  )
}
