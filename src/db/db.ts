import Dexie, { type Table } from 'dexie'
import { upgradeToV2 } from './migrations/v2'
import { upgradeToV3 } from './migrations/v3'
import type {
  Exercise,
  ID,
  Routine,
  RoutineExercise,
  SetEntry,
  Settings,
  Split,
  Workout,
} from './types'

/**
 * O banco com as tabelas tipadas. `Table<T, ID>` (e não `EntityTable`) porque o id
 * é sempre um UUID nosso, obrigatório já na inserção (não é auto-incremento).
 */
export type EncoreDB = Dexie & {
  exercises: Table<Exercise, ID>
  splits: Table<Split, ID>
  routines: Table<Routine, ID>
  routineExercises: Table<RoutineExercise, ID>
  workouts: Table<Workout, ID>
  setEntries: Table<SetEntry, ID>
  settings: Table<Settings, ID>
}

/**
 * Schema da versão 1. Fica exportado porque o teste da migração precisa
 * criar um banco "antigo" para migrar.
 *
 * Como ler: o primeiro item é a chave primária; os demais são índices.
 * `[a+b]` é um índice composto. Só campos usados em buscas/ordenação viram índice.
 */
export const SCHEMA_V1 = {
  exercises: 'id, name, muscleGroup, updatedAt',
  routines: 'id, order, updatedAt',
  // Exercícios de uma rotina, já na ordem certa.
  routineExercises: 'id, [routineId+position], exerciseId, updatedAt',
  // Histórico de treinos do mais recente para o mais antigo.
  workouts: 'id, startedAt, routineId, updatedAt',
  // [workoutId+position]: séries de um treino, em ordem.
  // [exerciseId+completedAt]: histórico de um exercício ao longo do tempo
  // (séries com completedAt = null ficam fora deste índice).
  setEntries: 'id, [workoutId+position], [exerciseId+completedAt], updatedAt',
}

/** Versão atual do schema (a maior `db.version(...)` abaixo). O backup grava este número. */
export const SCHEMA_VERSION = 3

/**
 * Cria (ou abre) o banco. Recebe o nome para que os testes possam usar
 * um banco separado e descartável.
 *
 * Versões: cada mudança de ÍNDICES ou de tabelas cria uma versão nova, e as
 * antigas nunca são editadas (o aparelho do usuário pode estar em qualquer
 * uma delas). Campos comuns, sem índice, não contam como schema para o Dexie.
 */
export function createDatabase(name: string): EncoreDB {
  const db = new Dexie(name) as EncoreDB

  db.version(1).stores(SCHEMA_V1)

  // v2: nomes bilíngues (o índice `name` sai: a ordenação agora depende do
  // idioma e é feita em memória), tabela de configurações e cronômetro.
  db.version(2)
    .stores({
      exercises: 'id, muscleGroup, updatedAt',
      settings: 'id, updatedAt',
    })
    .upgrade(upgradeToV2)

  // v3: divisões de treino (Upper/Lower, PPL...). Tabela nova; as rotinas ganham
  // `splitId` (campo comum, sem índice) e a migração organiza as que já existem.
  db.version(3)
    .stores({
      splits: 'id, order, updatedAt',
    })
    .upgrade(upgradeToV3)

  // `updatedAt` aparece em todas as tabelas para a sincronização futura
  // conseguir perguntar "o que mudou desde a última vez?".

  return db
}

/** Instância única usada pelo app. */
export const db = createDatabase('encore')
