import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../db/types'
import {
  groupSetsByExercise,
  nextPendingSetId,
  suggestNextRoutineId,
  totalVolumeKg,
  workoutDurationMs,
} from './workoutStats'

/** Cria uma série de mentira só com o que importa para o teste. */
function makeSet(overrides: Partial<SetEntry>): SetEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    workoutId: 'w1',
    exerciseId: 'a',
    position: 0,
    weightKg: 0,
    reps: 0,
    type: 'normal',
    completedAt: null,
    ...overrides,
  }
}

describe('groupSetsByExercise', () => {
  it('agrupa por exercício na ordem em que cada um aparece', () => {
    const sets = [
      makeSet({ exerciseId: 'b', position: 2 }),
      makeSet({ exerciseId: 'a', position: 0 }),
      makeSet({ exerciseId: 'b', position: 1 }),
      makeSet({ exerciseId: 'a', position: 3 }),
    ]

    const groups = groupSetsByExercise(sets)

    expect(groups.map((g) => g.exerciseId)).toEqual(['a', 'b'])
    expect(groups[0].sets.map((s) => s.position)).toEqual([0, 3])
    expect(groups[1].sets.map((s) => s.position)).toEqual([1, 2])
  })
})

describe('suggestNextRoutineId', () => {
  const ids = ['upperA', 'lowerA', 'upperB', 'lowerB']

  it('sugere a rotina seguinte à última treinada', () => {
    expect(suggestNextRoutineId(ids, 'upperA')).toBe('lowerA')
    expect(suggestNextRoutineId(ids, 'upperB')).toBe('lowerB')
  })

  it('volta para a primeira depois da última', () => {
    expect(suggestNextRoutineId(ids, 'lowerB')).toBe('upperA')
  })

  it('sem histórico (ou rotina apagada), sugere a primeira', () => {
    expect(suggestNextRoutineId(ids, null)).toBe('upperA')
    expect(suggestNextRoutineId(ids, 'apagada')).toBe('upperA')
  })

  it('sem rotinas, não sugere nada', () => {
    expect(suggestNextRoutineId([], null)).toBeNull()
  })
})

describe('totalVolumeKg', () => {
  it('soma carga × reps só das séries concluídas', () => {
    const sets = [
      makeSet({ weightKg: 100, reps: 5, completedAt: 1 }),
      makeSet({ weightKg: 27.5, reps: 8, completedAt: 2 }),
      makeSet({ weightKg: 999, reps: 10, completedAt: null }),
    ]

    expect(totalVolumeKg(sets)).toBe(500 + 220)
  })
})

describe('workoutDurationMs', () => {
  const base = { startedAt: 1_000, endedAt: 100_000 }

  it('usa o cronômetro quando ele foi iniciado e parado', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: 10_000, timerStoppedAt: 70_000 }),
    ).toBe(60_000)
  })

  it('cronômetro iniciado e não parado conta até o fim do treino', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: 10_000, timerStoppedAt: null }),
    ).toBe(90_000)
  })

  it('sem cronômetro, estima pela abertura e finalização do treino', () => {
    expect(
      workoutDurationMs({ ...base, timerStartedAt: null, timerStoppedAt: null }),
    ).toBe(99_000)
  })
})

describe('nextPendingSetId', () => {
  /**
   * Treino com dois exercícios, A (3 séries) e B (2 séries).
   * `done` diz quais séries foram concluídas e em que horário.
   */
  function workout(done: Record<string, number> = {}) {
    const ids = ['a1', 'a2', 'a3', 'b1', 'b2']
    const sets = ids.map((id, position) =>
      makeSet({
        id,
        position,
        exerciseId: id[0],
        completedAt: done[id] ?? null,
      }),
    )
    return groupSetsByExercise(sets)
  }

  it('sem nada feito, é a primeira série', () => {
    expect(nextPendingSetId(workout())).toBe('a1')
  })

  it('segue para a próxima série do mesmo exercício', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2 }))).toBe('a3')
  })

  it('exercício terminado: vai para o próximo exercício', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2, a3: 3 }))).toBe('b1')
  })

  it('acompanha o usuário quando ele pula um exercício', () => {
    // Máquina do A ocupada: começou pelo B.
    expect(nextPendingSetId(workout({ b1: 1 }))).toBe('b2')
  })

  it('no fim da lista, volta para o exercício que ficou para trás', () => {
    expect(nextPendingSetId(workout({ b1: 1, b2: 2 }))).toBe('a1')
  })

  it('tudo feito: não há próxima', () => {
    expect(nextPendingSetId(workout({ a1: 1, a2: 2, a3: 3, b1: 4, b2: 5 }))).toBeNull()
  })
})
