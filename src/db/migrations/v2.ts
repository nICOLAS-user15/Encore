import type { Transaction } from 'dexie'
import { SEED_EXERCISES_V1 } from '../seed'
import type { ID, Translated } from '../types'

/*
 * Migração do banco da versão 1 para a 2. Roda UMA vez, sozinha, na primeira
 * abertura do app depois da atualização (o Dexie cuida disso), dentro de uma
 * transação: ou tudo dá certo, ou nada muda.
 *
 * O que muda:
 * 1. Exercícios: `name` (texto) vira `names` ({ pt, en }).
 * 2. Exercícios duplicados se juntam. Ex.: "Bench Press" (criado por um programa
 *    pronto) e "Supino reto com barra" (do seed) eram dois registros do
 *    mesmo exercício. As séries e rotinas do duplicado passam a apontar para o
 *    do seed, e o duplicado é excluído (exclusão lógica). Nenhuma série se perde.
 * 3. Treinos ganham os campos do cronômetro (`timerStartedAt`/`timerStoppedAt`),
 *    preenchidos com o início/fim que o treino já tinha.
 */

/** Formato de um exercício na versão 1 (só o que a migração precisa). */
type LegacyExercise = {
  id: ID
  name?: string
  names?: Translated
  isCustom: boolean
  deletedAt: number | null
  updatedAt: number
}

type WithExerciseId = { exerciseId: ID; updatedAt: number }

type LegacyWorkout = {
  startedAt: number
  endedAt: number | null
  timerStartedAt?: number | null
  timerStoppedAt?: number | null
}

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR')
}

/*
 * Só a lista ORIGINAL do seed (a que existia na versão 1): uma migração usa os
 * dados do momento em que foi escrita. Com a lista atual, exercícios do
 * programa seriam "fundidos" com exercícios que nem existem num banco v1.
 */
/** Nomes do seed por id. */
const seedNamesById = new Map(SEED_EXERCISES_V1.map((seed) => [seed.id, seed.names]))
/** Id do seed pelo nome em inglês (que é o mesmo nome usado no programa). */
const seedIdByEnglishName = new Map(
  SEED_EXERCISES_V1.map((seed) => [normalize(seed.names.en), seed.id]),
)
/**
 * Tradução em português de exercícios que o app antigo criava a partir de um
 * programa pronto (só nomes, em inglês -> português). Lista congelada: serve
 * apenas para bancos da versão 1.
 */
const LEGACY_PROGRAM_NAMES: Array<[en: string, pt: string]> = [
  ['Abs Machine', 'Abdominal na máquina'],
  ['Back Extensions', 'Hiperextensão lombar'],
  ['Bench Press', 'Supino reto com barra'],
  ['Cable Lateral Raises', 'Elevação lateral na polia'],
  ['Cable Triceps Pushdown', 'Tríceps na polia'],
  ['Calf Raises (seated)', 'Panturrilha sentado'],
  ['Calf Raises (standing)', 'Panturrilha em pé'],
  ['Curls 45°', 'Rosca no banco 45°'],
  ['Fly Machine', 'Crucifixo na máquina (peck deck)'],
  ['French Triceps (rope)', 'Tríceps francês na corda'],
  ['Incline Dumbbell Bench Press', 'Supino inclinado com halteres'],
  ['Lat Pulldown', 'Puxada frontal'],
  ['Lateral Raises (dumbbells)', 'Elevação lateral'],
  ['Leg Curl Machine', 'Mesa flexora'],
  ['Leg Extensions', 'Cadeira extensora'],
  ['Pendulum / Hack Squat', 'Agachamento pêndulo / hack'],
  ['RDL (dumbbells)', 'Terra romeno com halteres'],
  ['Scott Curl Machine', 'Rosca Scott na máquina'],
  ['Squats', 'Agachamento livre'],
  ['T-Bar Row', 'Remada cavalinho'],
  ['Triangle Lat Pulldown', 'Puxada com triângulo'],
  ['Unilateral Leg Press', 'Leg press unilateral'],
  ['Unilateral Rows (lower back)', 'Remada unilateral (lombar)'],
]
const programNamesByEnglish = new Map(
  LEGACY_PROGRAM_NAMES.map(([en, pt]) => [normalize(en), { pt, en }] as const),
)

export async function upgradeToV2(tx: Transaction): Promise<void> {
  const now = Date.now()
  /** id do duplicado -> id do exercício do seed que fica. */
  const mergeInto = new Map<ID, ID>()

  // 1 e 2: nomes traduzidos + marcar duplicados.
  await tx
    .table<LegacyExercise>('exercises')
    .toCollection()
    .modify((exercise) => {
      const oldName = exercise.name ?? ''
      const key = normalize(oldName)
      const seedTarget = seedIdByEnglishName.get(key)

      if (seedNamesById.has(exercise.id)) {
        exercise.names = seedNamesById.get(exercise.id)
      } else if (exercise.isCustom && seedTarget !== undefined) {
        // Duplicado de um exercício do seed: some da lista, o histórico vai para o seed.
        mergeInto.set(exercise.id, seedTarget)
        exercise.names = { pt: oldName, en: oldName }
        exercise.deletedAt = exercise.deletedAt ?? now
      } else {
        exercise.names = programNamesByEnglish.get(key) ?? { pt: oldName, en: oldName }
      }

      delete exercise.name
      exercise.updatedAt = now
    })

  // 2: séries e rotinas do duplicado passam a apontar para o exercício do seed.
  if (mergeInto.size > 0) {
    for (const tableName of ['routineExercises', 'setEntries']) {
      await tx
        .table<WithExerciseId>(tableName)
        .toCollection()
        .modify((row) => {
          const target = mergeInto.get(row.exerciseId)
          if (target !== undefined) {
            row.exerciseId = target
            row.updatedAt = now
          }
        })
    }
  }

  // 3: cronômetro dos treinos que já existiam.
  await tx
    .table<LegacyWorkout>('workouts')
    .toCollection()
    .modify((workout) => {
      workout.timerStartedAt = workout.startedAt
      workout.timerStoppedAt = workout.endedAt
    })
}
