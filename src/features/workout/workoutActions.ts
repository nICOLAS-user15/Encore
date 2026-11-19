import Dexie from 'dexie'
import type { EncoreDB } from '../../db/db'
import {
  createRecord,
  isActive,
  restoreRecord,
  softDelete,
  updateRecord,
  updateRecordWith,
} from '../../db/repository'
import type { ID, SetEntry, SetType, Workout } from '../../db/types'
import { listRoutineExercises } from '../routines/routineQueries'
import {
  getActiveWorkout,
  getLastPerformance,
  listWorkoutSets,
  type LastPerformance,
} from './workoutQueries'
import { pendingPlannedSets } from './progression'
import { isWorkingSet, warmupValues } from './workoutStats'

/*
 * Tudo que ESCREVE durante um treino. Cada função grava na hora: se o app
 * fechar no meio do treino, nada se perde (o treino sem `endedAt` continua ativo).
 */

type SetValues = Pick<SetEntry, 'weightKg' | 'reps'>

const EMPTY_VALUES: SetValues = { weightKg: 0, reps: 0 }

/**
 * Valores para a série número `index`: o que foi feito na mesma série da
 * última vez; se a última vez teve menos séries, repete a última delas;
 * sem histórico, usa o `fallback`.
 */
function pickValues(
  last: LastPerformance | null,
  index: number,
  fallback: SetValues,
): SetValues {
  // Séries extras (encore) da última vez não servem de molde para as planejadas.
  const planned = last?.sets.filter((set) => set.type === 'normal') ?? []
  const source = planned[index] ?? planned.at(-1) ?? last?.sets.at(-1)
  return source ? { weightKg: source.weightKg, reps: source.reps } : fallback
}

/** Próxima posição livre no treino (inclui séries excluídas, para nunca repetir). */
async function nextPosition(db: EncoreDB, workoutId: ID): Promise<number> {
  const last = await db.setEntries
    .where('[workoutId+position]')
    .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
    .last()
  return last ? last.position + 1 : 0
}

function createSet(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  position: number,
  values: SetValues,
  type: SetType,
): Promise<SetEntry> {
  return createRecord(db.setEntries, {
    workoutId,
    exerciseId,
    position,
    weightKg: values.weightKg,
    reps: values.reps,
    type,
    completedAt: null,
  })
}

/**
 * Inicia um treino (livre com `routineId = null`, ou a partir de uma rotina).
 * Se já existe um treino em andamento, devolve ele em vez de criar outro.
 * A partir de rotina, já cria as séries planejadas, preenchidas.
 */
export async function startWorkout(db: EncoreDB, routineId: ID | null): Promise<Workout> {
  return db.transaction(
    'rw',
    [db.workouts, db.setEntries, db.routineExercises, db.routines],
    async () => {
      const active = await getActiveWorkout(db)
      if (active) {
        return active
      }
      // Tela desatualizada (rotina excluída em outra aba): não cria treino órfão.
      if (routineId !== null) {
        const routine = await db.routines.get(routineId)
        if (!routine || !isActive(routine)) {
          throw new Error(`Rotina ${routineId} não encontrada`)
        }
      }

      const workout = await createRecord(db.workouts, {
        routineId,
        startedAt: Date.now(),
        endedAt: null,
        // O cronômetro só começa quando o usuário tocar em "Iniciar cronômetro".
        timerStartedAt: null,
        timerStoppedAt: null,
        timerPausedAt: null,
        notes: '',
      })

      if (routineId !== null) {
        const items = await listRoutineExercises(db, routineId)
        let position = 0
        for (const item of items) {
          const last = await getLastPerformance(db, item.exerciseId, workout.id)
          const fallback: SetValues = {
            weightKg: item.referenceWeightKg ?? 0,
            reps: item.referenceReps ?? item.targetRepsMin,
          }
          for (let index = 0; index < item.targetSets; index++) {
            const values = pickValues(last, index, fallback)
            await createSet(db, workout.id, item.exerciseId, position, values, 'normal')
            position++
          }
        }
      }

      return workout
    },
  )
}

export type StartResult =
  | { status: 'started'; workout: Workout }
  /** Já existe outro treino em andamento COM séries feitas: a tela pergunta o que fazer. */
  | { status: 'blocked'; active: Workout }

/**
 * Iniciar pela lista (aba Treino ou Rotinas), permitindo trocar de ideia:
 * - mesmo treino já aberto: continua nele;
 * - outro treino aberto, mas sem nenhuma série concluída (ex.: tocou no treino
 *   errado): ele é descartado, porque não há nada a perder, e o novo começa;
 * - outro treino com séries feitas: não mexe em nada e devolve `blocked`.
 */
export async function startOrSwitchWorkout(
  db: EncoreDB,
  routineId: ID | null,
): Promise<StartResult> {
  // Uma transação só: a checagem "sem série concluída" e o descarte não se separam.
  return db.transaction(
    'rw',
    [db.workouts, db.setEntries, db.routineExercises, db.routines],
    async (): Promise<StartResult> => {
      const active = await getActiveWorkout(db)
      if (active && active.routineId !== routineId) {
        const sets = await listWorkoutSets(db, active.id)
        if (sets.some((set) => set.completedAt !== null)) {
          return { status: 'blocked', active }
        }
        await deleteWorkout(db, active.id)
      }
      return { status: 'started', workout: await startWorkout(db, routineId) }
    },
  )
}

/** Adiciona um exercício ao treino (com uma série, preenchida pela última vez). */
export async function addExerciseToWorkout(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<SetEntry> {
  return db.transaction('rw', db.setEntries, async () => {
    const last = await getLastPerformance(db, exerciseId, workoutId)
    const position = await nextPosition(db, workoutId)
    return createSet(
      db,
      workoutId,
      exerciseId,
      position,
      pickValues(last, 0, EMPTY_VALUES),
      'normal',
    )
  })
}

/**
 * Adiciona mais uma série a um exercício, copiando a carga e as reps da
 * série anterior. `type: 'encore'` marca a série extra, além do planejado.
 */
export async function addSet(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  type: SetType,
): Promise<SetEntry> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = (await listWorkoutSets(db, workoutId)).filter(
      (set) => set.exerciseId === exerciseId,
    )
    let values: SetValues
    if (type === 'warmup') {
      // Aquecimento: metade da carga da primeira série de trabalho.
      values = warmupValues(sets)
    } else {
      // Série normal/encore: copia a última série de TRABALHO (não o aquecimento).
      const previous = sets.filter(isWorkingSet).at(-1)
      values = previous
        ? { weightKg: previous.weightKg, reps: previous.reps }
        : EMPTY_VALUES
    }
    const position = await nextPosition(db, workoutId)
    return createSet(db, workoutId, exerciseId, position, values, type)
  })
}

export async function updateSet(
  db: EncoreDB,
  setId: ID,
  changes: Partial<Pick<SetEntry, 'weightKg' | 'reps'>>,
): Promise<void> {
  await updateRecord(db.setEntries, setId, changes)
}

/**
 * Botão "Aplicar" da sugestão de carga: grava carga e repetições em todas as
 * séries planejadas que ainda faltam deste exercício. Aquecimento, encore e
 * séries já feitas ficam como estão. Devolve quantas séries mudaram.
 */
export async function applyLoadSuggestion(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
  values: SetValues,
): Promise<number> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = await listWorkoutSets(db, workoutId)
    const targets = pendingPlannedSets(
      sets.filter((set) => set.exerciseId === exerciseId),
    )
    for (const set of targets) {
      await updateRecord(db.setEntries, set.id, values)
    }
    return targets.length
  })
}

/**
 * Depois de mudar a carga de uma série, as séries planejadas que ainda faltam e estavam
 * com a MESMA carga antiga acompanham a nova (60 → 65 kg na 1ª leva as outras para 65).
 * Séries que o usuário já ajustou à mão (carga diferente) não são tocadas.
 * Devolve quantas séries mudaram.
 */
export async function followWeightChange(
  db: EncoreDB,
  set: Pick<SetEntry, 'id' | 'workoutId' | 'exerciseId' | 'type'>,
  fromKg: number,
  toKg: number,
): Promise<number> {
  if (set.type !== 'normal' || fromKg === toKg) {
    return 0
  }
  return db.transaction('rw', db.setEntries, async () => {
    const sets = await listWorkoutSets(db, set.workoutId)
    const followers = pendingPlannedSets(
      sets.filter((other) => other.exerciseId === set.exerciseId),
    ).filter((other) => other.id !== set.id && other.weightKg === fromKg)
    for (const follower of followers) {
      await updateRecord(db.setEntries, follower.id, { weightKg: toKg })
    }
    return followers.length
  })
}

/** Marca/desmarca a série como concluída. Devolve `true` se ficou concluída. */
export async function toggleSetCompleted(db: EncoreDB, setId: ID): Promise<boolean> {
  // Ler e gravar na mesma transação: um toque duplo não conclui duas vezes.
  let completed = false
  await updateRecordWith(db.setEntries, setId, (set) => {
    completed = set.completedAt === null
    return { completedAt: completed ? Date.now() : null }
  })
  return completed
}

export async function deleteSet(db: EncoreDB, setId: ID): Promise<void> {
  await softDelete(db.setEntries, setId)
}

/**
 * Tira um exercício do treino (exclui todas as séries dele neste treino).
 * Devolve os ids excluídos, para o "Desfazer" (`restoreSets`).
 */
export async function removeExerciseFromWorkout(
  db: EncoreDB,
  workoutId: ID,
  exerciseId: ID,
): Promise<ID[]> {
  return db.transaction('rw', db.setEntries, async () => {
    const sets = (await listWorkoutSets(db, workoutId)).filter(
      (set) => set.exerciseId === exerciseId,
    )
    for (const set of sets) {
      await softDelete(db.setEntries, set.id)
    }
    return sets.map((set) => set.id)
  })
}

/** Desfaz a exclusão de séries (botão "Desfazer"). */
export async function restoreSets(db: EncoreDB, setIds: ID[]): Promise<void> {
  await db.transaction('rw', db.setEntries, async () => {
    for (const id of setIds) {
      await restoreRecord(db.setEntries, id)
    }
  })
}

/** Liga o cronômetro do treino (só funciona uma vez: depois de iniciado, não reinicia). */
export async function startWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (workout && workout.timerStartedAt === null) {
    await updateRecord(db.workouts, workoutId, { timerStartedAt: Date.now() })
  }
}

/** Pausa o cronômetro (se estiver rodando): o relógio congela até retomar. */
export async function pauseWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (
    workout &&
    workout.timerStartedAt !== null &&
    workout.timerStoppedAt === null &&
    !workout.timerPausedAt
  ) {
    await updateRecord(db.workouts, workoutId, { timerPausedAt: Date.now() })
  }
}

/**
 * Retoma o cronômetro pausado. Avança `timerStartedAt` pelo tempo da pausa, para
 * ele não contar na duração (e o relógio continuar de onde parou).
 */
export async function resumeWorkoutTimer(db: EncoreDB, workoutId: ID): Promise<void> {
  const workout = await db.workouts.get(workoutId)
  if (workout && workout.timerStartedAt !== null && workout.timerPausedAt) {
    await updateRecord(db.workouts, workoutId, {
      timerStartedAt: workout.timerStartedAt + (Date.now() - workout.timerPausedAt),
      timerPausedAt: null,
    })
  }
}

/**
 * Exclui o treino e todas as suas séries (descartar ou apagar do histórico).
 * Devolve os ids das séries excluídas, para o "Desfazer" (`restoreWorkout`).
 */
export async function deleteWorkout(db: EncoreDB, workoutId: ID): Promise<ID[]> {
  return db.transaction('rw', [db.workouts, db.setEntries], async () => {
    const sets = await listWorkoutSets(db, workoutId)
    for (const set of sets) {
      await softDelete(db.setEntries, set.id)
    }
    await softDelete(db.workouts, workoutId)
    return sets.map((set) => set.id)
  })
}

/** Desfaz `deleteWorkout`: o treino e as séries que ele excluiu voltam. */
export async function restoreWorkout(
  db: EncoreDB,
  workoutId: ID,
  setIds: ID[],
): Promise<void> {
  await db.transaction('rw', [db.workouts, db.setEntries], async () => {
    await restoreRecord(db.workouts, workoutId)
    for (const id of setIds) {
      await restoreRecord(db.setEntries, id)
    }
  })
}

/**
 * Finaliza o treino: descarta as séries não concluídas e grava `endedAt`.
 * Sem nenhuma série concluída não há o que salvar: o treino é descartado.
 */
export async function finishWorkout(
  db: EncoreDB,
  workoutId: ID,
): Promise<'finished' | 'discarded'> {
  return db.transaction('rw', [db.workouts, db.setEntries], async () => {
    // Segundo toque em "Finalizar" (ou outra aba): já finalizado, não mexe em `endedAt`.
    const existing = await db.workouts.get(workoutId)
    if (existing?.endedAt != null) {
      return 'finished'
    }
    const sets = await listWorkoutSets(db, workoutId)
    const completed = sets.filter((set) => set.completedAt !== null)
    if (completed.length === 0) {
      await deleteWorkout(db, workoutId)
      return 'discarded'
    }

    for (const set of sets) {
      if (set.completedAt === null) {
        await softDelete(db.setEntries, set.id)
      }
    }
    // Finalizar também para o cronômetro, se ele ainda estiver rodando ou pausado
    // (pausado: o tempo para no instante da pausa, não no da finalização).
    const workout = await db.workouts.get(workoutId)
    const timerRunning =
      workout !== undefined &&
      workout.timerStartedAt !== null &&
      workout.timerStoppedAt === null
    const now = Date.now()
    await updateRecord(
      db.workouts,
      workoutId,
      timerRunning
        ? {
            endedAt: now,
            timerStoppedAt: workout.timerPausedAt ?? now,
            timerPausedAt: null,
          }
        : { endedAt: now },
    )
    return 'finished'
  })
}
