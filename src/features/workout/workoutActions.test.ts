import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import type { ID } from '../../db/types'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  addExerciseToWorkout,
  addSet,
  deleteWorkout,
  finishWorkout,
  followWeightChange,
  pauseWorkoutTimer,
  removeExerciseFromWorkout,
  restoreSets,
  restoreWorkout,
  resumeWorkoutTimer,
  startOrSwitchWorkout,
  startWorkout,
  startWorkoutTimer,
  toggleSetCompleted,
  updateSet,
} from './workoutActions'
import { getActiveWorkout, listFinishedWorkouts, listWorkoutSets } from './workoutQueries'
import { groupSetsByExercise, timerElapsedMs, workoutDurationMs } from './workoutStats'

let db: EncoreDB
let upperA: ID
let benchPress: ID

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await importTestProgram(db)
  const [first] = await listRoutinesWithExercises(db)
  upperA = first.routine.id
  benchPress = first.items[0].exerciseId
})

afterEach(async () => {
  await db.delete()
})

describe('startWorkout', () => {
  it('treino livre começa sem séries e fica ativo', async () => {
    const workout = await startWorkout(db, null)

    expect(workout.endedAt).toBeNull()
    expect(await listWorkoutSets(db, workout.id)).toEqual([])
    expect((await getActiveWorkout(db))?.id).toBe(workout.id)
  })

  it('não cria um segundo treino se já existe um em andamento', async () => {
    const first = await startWorkout(db, null)
    const second = await startWorkout(db, upperA)

    expect(second.id).toBe(first.id)
    expect(await db.workouts.count()).toBe(1)
  })

  it('a partir da rotina, cria as séries planejadas com a referência', async () => {
    const workout = await startWorkout(db, upperA)
    const sets = await listWorkoutSets(db, workout.id)

    // Upper A: 3 + 3 + 2 + 2 + 2 + 2 + 2 séries
    expect(sets).toHaveLength(16)
    const groups = groupSetsByExercise(sets)
    expect(groups).toHaveLength(7)
    expect(groups[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [25, 8],
      [25, 8],
      [25, 8],
    ])
    // Scott Curl não tem reps de referência: usa o mínimo da faixa (6).
    expect(groups[5].sets[0]).toMatchObject({ weightKg: 15, reps: 6 })
    expect(sets.every((s) => s.completedAt === null && s.type === 'normal')).toBe(true)
  })

  it('no treino seguinte, preenche com o que foi feito da última vez', async () => {
    const first = await startWorkout(db, upperA)
    const bench = (await listWorkoutSets(db, first.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    const done = [
      [30, 10],
      [30, 9],
      [27.5, 8],
    ]
    for (const [index, set] of bench.entries()) {
      await updateSet(db, set.id, { weightKg: done[index][0], reps: done[index][1] })
      await toggleSetCompleted(db, set.id)
    }
    await finishWorkout(db, first.id)

    const second = await startWorkout(db, upperA)
    const nextBench = (await listWorkoutSets(db, second.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    expect(nextBench.map((s) => [s.weightKg, s.reps])).toEqual(done)
  })
})

describe('séries', () => {
  it('addSet copia a série anterior e marca o tipo', async () => {
    const workout = await startWorkout(db, upperA)

    const encore = await addSet(db, workout.id, benchPress, 'encore')

    expect(encore).toMatchObject({ weightKg: 25, reps: 8, type: 'encore' })
    const bench = (await listWorkoutSets(db, workout.id)).filter(
      (s) => s.exerciseId === benchPress,
    )
    expect(bench).toHaveLength(4)
  })

  it('addExerciseToWorkout cria uma série zerada para exercício sem histórico', async () => {
    const workout = await startWorkout(db, null)

    const set = await addExerciseToWorkout(db, workout.id, benchPress)

    expect(set).toMatchObject({ weightKg: 0, reps: 0, position: 0 })
  })

  it('toggleSetCompleted marca e desmarca', async () => {
    const workout = await startWorkout(db, upperA)
    const [set] = await listWorkoutSets(db, workout.id)

    expect(await toggleSetCompleted(db, set.id)).toBe(true)
    expect((await db.setEntries.get(set.id))?.completedAt).toBeTypeOf('number')
    expect(await toggleSetCompleted(db, set.id)).toBe(false)
    expect((await db.setEntries.get(set.id))?.completedAt).toBeNull()
  })
})

describe('finalizar e excluir', () => {
  it('finishWorkout grava endedAt e descarta séries não concluídas', async () => {
    const workout = await startWorkout(db, upperA)
    const [first] = await listWorkoutSets(db, workout.id)
    await toggleSetCompleted(db, first.id)

    expect(await finishWorkout(db, workout.id)).toBe('finished')

    expect(await getActiveWorkout(db)).toBeUndefined()
    const finished = await listFinishedWorkouts(db)
    expect(finished.map((w) => w.id)).toEqual([workout.id])
    expect((await listWorkoutSets(db, workout.id)).map((s) => s.id)).toEqual([first.id])
  })

  it('finishWorkout sem séries concluídas descarta o treino', async () => {
    const workout = await startWorkout(db, upperA)

    expect(await finishWorkout(db, workout.id)).toBe('discarded')

    expect(await getActiveWorkout(db)).toBeUndefined()
    expect(await listFinishedWorkouts(db)).toEqual([])
  })

  it('deleteWorkout faz exclusão lógica do treino e das séries', async () => {
    const workout = await startWorkout(db, upperA)

    await deleteWorkout(db, workout.id)

    expect((await db.workouts.get(workout.id))?.deletedAt).toBeTypeOf('number')
    expect(await listWorkoutSets(db, workout.id)).toEqual([])
    expect(await db.setEntries.count()).toBe(16) // as linhas continuam lá
  })
})

describe('cronômetro do treino', () => {
  it('começa parado e inicia uma vez só', async () => {
    const workout = await startWorkout(db, upperA)
    expect(workout).toMatchObject({ timerStartedAt: null, timerStoppedAt: null })

    await startWorkoutTimer(db, workout.id)
    const started = (await db.workouts.get(workout.id))?.timerStartedAt
    expect(started).toBeTypeOf('number')

    // Iniciar de novo não "zera" o cronômetro.
    await startWorkoutTimer(db, workout.id)
    expect((await db.workouts.get(workout.id))?.timerStartedAt).toBe(started)
  })

  it('pausar congela o relógio e retomar continua de onde parou', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(1_000_000)
      const workout = await startWorkout(db, upperA)
      await startWorkoutTimer(db, workout.id)

      vi.setSystemTime(1_000_000 + 60_000) // 1 min de treino
      await pauseWorkoutTimer(db, workout.id)
      vi.setSystemTime(1_000_000 + 360_000) // 5 min parado (banheiro)
      const paused = (await db.workouts.get(workout.id))!
      expect(timerElapsedMs(paused, Date.now())).toBe(60_000)

      await resumeWorkoutTimer(db, workout.id)
      const resumed = (await db.workouts.get(workout.id))!
      expect(resumed.timerPausedAt).toBeNull()
      expect(timerElapsedMs(resumed, Date.now())).toBe(60_000)

      vi.setSystemTime(1_000_000 + 420_000) // mais 1 min rodando
      expect(timerElapsedMs(resumed, Date.now())).toBe(120_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('finalizar com o cronômetro pausado usa o instante da pausa', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(1_000_000)
      const workout = await startWorkout(db, upperA)
      await startWorkoutTimer(db, workout.id)
      const [first] = await listWorkoutSets(db, workout.id)
      await toggleSetCompleted(db, first.id)

      vi.setSystemTime(1_000_000 + 90_000)
      await pauseWorkoutTimer(db, workout.id)
      vi.setSystemTime(1_000_000 + 600_000)
      await finishWorkout(db, workout.id)

      const finished = (await db.workouts.get(workout.id))!
      expect(workoutDurationMs(finished)).toBe(90_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pausar e retomar sem estar rodando/pausado não faz nada', async () => {
    const workout = await startWorkout(db, upperA)

    await pauseWorkoutTimer(db, workout.id) // não iniciado
    await resumeWorkoutTimer(db, workout.id) // não pausado

    expect((await db.workouts.get(workout.id))?.timerPausedAt ?? null).toBeNull()
  })

  it('finalizar o treino para o cronômetro que ainda está rodando', async () => {
    const workout = await startWorkout(db, upperA)
    await startWorkoutTimer(db, workout.id)
    const [first] = await listWorkoutSets(db, workout.id)
    await toggleSetCompleted(db, first.id)

    await finishWorkout(db, workout.id)

    const finished = await db.workouts.get(workout.id)
    expect(finished?.timerStoppedAt).toBe(finished?.endedAt)
  })
})

describe('desfazer exclusões', () => {
  it('remover um exercício devolve os ids e restoreSets traz as séries de volta', async () => {
    const workout = await startWorkout(db, upperA)
    const before = await listWorkoutSets(db, workout.id)

    const removed = await removeExerciseFromWorkout(db, workout.id, benchPress)
    expect(removed.length).toBeGreaterThan(0)
    expect(await listWorkoutSets(db, workout.id)).toHaveLength(
      before.length - removed.length,
    )

    await restoreSets(db, removed)

    expect(await listWorkoutSets(db, workout.id)).toHaveLength(before.length)
  })

  it('restoreWorkout desfaz deleteWorkout (treino e séries)', async () => {
    const workout = await startWorkout(db, upperA)
    const before = await listWorkoutSets(db, workout.id)

    const setIds = await deleteWorkout(db, workout.id)
    expect(await getActiveWorkout(db)).toBeFalsy()

    await restoreWorkout(db, workout.id, setIds)

    expect((await getActiveWorkout(db))?.id).toBe(workout.id)
    expect(await listWorkoutSets(db, workout.id)).toHaveLength(before.length)
  })
})

describe('carga que acompanha as próximas séries', () => {
  it('séries pendentes com a carga antiga passam para a nova; as ajustadas à mão ficam', async () => {
    const workout = await startWorkout(db, upperA)
    const sets = (await listWorkoutSets(db, workout.id)).filter(
      (set) => set.exerciseId === benchPress && set.type === 'normal',
    )
    const [first, second, third] = sets
    // A 3ª já foi ajustada pelo usuário (carga diferente): não deve mudar.
    await updateSet(db, third.id, { weightKg: 20 })
    const oldKg = first.weightKg

    await updateSet(db, first.id, { weightKg: oldKg + 5 })
    const changed = await followWeightChange(db, first, oldKg, oldKg + 5)

    expect(changed).toBe(1)
    const after = await listWorkoutSets(db, workout.id)
    expect(after.find((set) => set.id === second.id)?.weightKg).toBe(oldKg + 5)
    expect(after.find((set) => set.id === third.id)?.weightKg).toBe(20)
  })
})

describe('trocar de treino e atomicidade', () => {
  it('toque duplo em concluir não conclui duas vezes (o segundo desfaz)', async () => {
    const workout = await startWorkout(db, upperA)
    const [first] = await listWorkoutSets(db, workout.id)

    const results = await Promise.all([
      toggleSetCompleted(db, first.id),
      toggleSetCompleted(db, first.id),
    ])

    expect(results).toEqual([true, false])
  })

  it('startOrSwitchWorkout: continua no mesmo, troca se nada foi feito, bloqueia se houve séries', async () => {
    const [, second] = await listRoutinesWithExercises(db)
    const a = await startOrSwitchWorkout(db, upperA)
    expect(a.status).toBe('started')
    const again = await startOrSwitchWorkout(db, upperA)
    expect(again.status === 'started' && again.workout.id).toBe(
      a.status === 'started' && a.workout.id,
    )

    // Nenhuma série concluída: trocar de rotina descarta o treino aberto.
    const switched = await startOrSwitchWorkout(db, second.routine.id)
    expect(switched.status).toBe('started')

    // Com uma série concluída, trocar fica bloqueado.
    if (switched.status !== 'started') throw new Error('esperava started')
    const [set] = await listWorkoutSets(db, switched.workout.id)
    await toggleSetCompleted(db, set.id)
    const blocked = await startOrSwitchWorkout(db, upperA)
    expect(blocked.status).toBe('blocked')
  })

  it('não inicia treino de rotina que não existe mais', async () => {
    await expect(startWorkout(db, 'rotina-inexistente')).rejects.toThrow()
  })
})
