import type { ID, Routine, RoutineExercise } from '../../db/types'

/*
 * Rascunho de uma rotina: o que o usuário está editando na tela ANTES de tocar em
 * "Salvar". Nada disto vai para o banco até o Salvar (veja saveRoutine).
 *
 * Funções puras (sem banco, sem React): fáceis de testar.
 */

/** Um exercício da rotina dentro do rascunho. */
export type DraftItem = {
  /** Chave estável na tela (React key): não muda quando a lista é reordenada. */
  key: string
  /** Id do registro no banco. Ausente = exercício adicionado agora, ainda não salvo. */
  id?: ID
  exerciseId: ID
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  referenceWeightKg: number | null
  referenceReps: number | null
  notes: string
  restSeconds: number | null
}

export type RoutineDraft = {
  name: string
  notes: string
  splitId: ID
  /** Posição desejada entre as rotinas da divisão (0 = a primeira). */
  position: number
  items: DraftItem[]
}

/** Meta padrão de um exercício recém-adicionado a uma rotina. */
export const DEFAULT_TARGET = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 }

/** Rascunho de uma rotina nova: vazia, no fim da divisão. */
export function blankDraft(splitId: ID, routinesInSplit: number): RoutineDraft {
  return { name: '', notes: '', splitId, position: routinesInSplit, items: [] }
}

/** Rascunho de uma rotina que já existe (o ponto de partida da edição). */
export function draftFromRoutine(
  routine: Routine,
  items: RoutineExercise[],
  position: number,
): RoutineDraft {
  return {
    name: routine.name,
    notes: routine.notes,
    splitId: routine.splitId,
    position,
    items: items.map((item) => ({
      key: item.id,
      id: item.id,
      exerciseId: item.exerciseId,
      targetSets: item.targetSets,
      targetRepsMin: item.targetRepsMin,
      targetRepsMax: item.targetRepsMax,
      referenceWeightKg: item.referenceWeightKg,
      referenceReps: item.referenceReps,
      // Itens salvos antes de o campo existir não o têm.
      notes: item.notes,
      restSeconds: item.restSeconds ?? null,
    })),
  }
}

/** Um exercício novo no rascunho, com a meta padrão (3 × 8–12). */
export function newDraftItem(exerciseId: ID): DraftItem {
  return {
    key: crypto.randomUUID(),
    exerciseId,
    ...DEFAULT_TARGET,
    referenceWeightKg: null,
    referenceReps: null,
    notes: '',
    restSeconds: null,
  }
}

/** Há alguma diferença entre o rascunho e o ponto de partida? */
export function isDraftDirty(draft: RoutineDraft, initial: RoutineDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(initial)
}

/** Troca o exercício de lugar com o vizinho de cima (-1) ou de baixo (+1). */
export function moveDraftItem(
  items: DraftItem[],
  index: number,
  direction: -1 | 1,
): DraftItem[] {
  const target = index + direction
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items
  }
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Troca um campo de um exercício, mantendo a faixa de repetições coerente (mín ≤ máx). */
export function updateDraftItem(
  items: DraftItem[],
  key: string,
  changes: Partial<DraftItem>,
): DraftItem[] {
  return items.map((item) => {
    if (item.key !== key) {
      return item
    }
    const next = { ...item, ...changes }
    // A faixa nunca fica invertida: subir o mínimo empurra o máximo, e vice-versa.
    if (changes.targetRepsMin !== undefined && next.targetRepsMin > next.targetRepsMax) {
      next.targetRepsMax = next.targetRepsMin
    }
    if (changes.targetRepsMax !== undefined && next.targetRepsMax < next.targetRepsMin) {
      next.targetRepsMin = next.targetRepsMax
    }
    return next
  })
}
