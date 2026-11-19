/*
 * Tipos das tabelas do banco local.
 *
 * Regras pensadas para a sincronização futura:
 * - `id` é um UUID gerado no próprio aparelho (não depende de servidor).
 * - Datas são números em milissegundos desde 1970 (`Date.now()`): fáceis de
 *   comparar, ordenar e indexar.
 * - Nada é apagado de verdade: `deletedAt` preenchido = registro excluído.
 *   Assim outro aparelho consegue "ficar sabendo" da exclusão ao sincronizar.
 */

export type ID = string
/** Milissegundos desde 01/01/1970 (o mesmo que `Date.now()`). */
export type Timestamp = number

/** Campos que todo registro tem. */
export type BaseRecord = {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
  /** `null` = registro ativo. Preenchido = excluído (exclusão lógica). */
  deletedAt: Timestamp | null
}

/** Os dados "de verdade" de um registro, sem os campos automáticos. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const
/** Os nomes de cada grupo na tela ficam nos dicionários (src/i18n). */
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

/**
 * Equipamentos em que a carga sobe em saltos (anilhas, halteres, pilha da máquina).
 * Peso corporal fica de fora: nele a progressão é em repetições.
 */
export const LOADED_EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
] as const satisfies readonly Equipment[]
export type LoadedEquipment = (typeof LOADED_EQUIPMENT)[number]

export const LANGUAGES = ['pt', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Um texto em cada idioma do app: `{ pt: 'Supino reto', en: 'Bench Press' }`. */
export type Translated = Record<Language, string>

export type Exercise = BaseRecord & {
  /** Nome em cada idioma. Exercícios criados pelo usuário repetem o mesmo nome nos dois. */
  names: Translated
  muscleGroup: MuscleGroup
  equipment: Equipment
  /** `true` = criado pelo usuário; `false` = veio do seed. */
  isCustom: boolean
}

/**
 * Divisão de treino: um grupo de rotinas que formam um ciclo (Upper/Lower, PPL,
 * ABC...). A aba Treino mostra uma divisão por vez.
 */
export type Split = BaseRecord & {
  name: string
  /** Posição da divisão na lista de abas (0, 1, 2...). */
  order: number
  /** Observações (ex.: "4x por semana, descanso de 90s"). */
  notes: string
}

export type Routine = BaseRecord & {
  name: string
  /** Divisão a que a rotina pertence. */
  splitId: ID
  /** Posição da rotina na lista, dentro da divisão (0, 1, 2...). */
  order: number
  /** Observações gerais (ex.: "Aquecer bem", "Alongar no final"). */
  notes: string
}

/** Liga um exercício a uma rotina, com a meta de séries e a faixa de repetições. */
export type RoutineExercise = BaseRecord & {
  routineId: ID
  exerciseId: ID
  position: number
  targetSets: number
  /** Faixa de repetições: "6-10" vira min 6, max 10. */
  targetRepsMin: number
  targetRepsMax: number
  /**
   * Carga e reps de referência, usadas para preencher as séries enquanto
   * ainda não existe histórico deste exercício. `null` = sem referência.
   */
  referenceWeightKg: number | null
  referenceReps: number | null
  /** Observação do exercício (ex.: "carga por lado"). */
  notes: string
  /**
   * Descanso deste exercício, em segundos. `null` = usa o padrão das Configurações.
   * Itens salvos antes deste campo existir não o têm: leia com `restSecondsOf`.
   */
  restSeconds: number | null
}

export type Workout = BaseRecord & {
  /** Rotina usada como base, ou `null` para treino livre. */
  routineId: ID | null
  /** Quando o treino foi aberto (data do treino no histórico). */
  startedAt: Timestamp
  /** `null` enquanto o treino está em andamento. */
  endedAt: Timestamp | null
  /**
   * Cronômetro controlado pelo usuário, separado da abertura do treino
   * (dá para fazer a mobilidade antes de começar a contar).
   * `null` = ainda não iniciado / ainda não parado.
   */
  timerStartedAt: Timestamp | null
  timerStoppedAt: Timestamp | null
  /**
   * Quando o cronômetro foi pausado (ex.: ir ao banheiro); `null`/ausente = não está
   * pausado. Ao retomar, `timerStartedAt` avança o tempo da pausa, então o tempo
   * parado nunca entra na duração. Opcional: treinos antigos não têm o campo
   * (sem índice, sem migração).
   */
  timerPausedAt?: Timestamp | null
  notes: string
}

/** Id fixo do único registro de configurações. */
export const SETTINGS_ID = 'app-settings'

/** Preferências do usuário (um registro só, com id fixo). */
export type Settings = BaseRecord & {
  language: Language
  /** Duração padrão do descanso, em segundos. */
  restSeconds: number
  /** Se o descanso começa sozinho ao concluir uma série. */
  autoStartRest: boolean
  /** Manter a tela ligada enquanto houver treino em andamento. */
  keepScreenOn: boolean
  /** Tocar um bipe quando o descanso acaba. */
  restSound: boolean
  /**
   * Menor salto de carga de cada equipamento na academia do usuário (kg).
   * Usado na sugestão de progressão e nos botões −/+ do editor de série.
   */
  weightStepsKg: Record<LoadedEquipment, number>
  /** Quando o último backup foi exportado neste aparelho (`null` = nunca). */
  lastBackupAt: Timestamp | null
  /** Divisão escolhida nas abas de Treino e Rotinas (`null` = a primeira). */
  activeSplitId: ID | null
}

/**
 * - `normal`: série planejada.
 * - `encore`: série extra ("bis"), feita além do planejado.
 * - `warmup`: aquecimento. Não conta no volume, no "última vez" nem em recordes.
 */
export type SetType = 'normal' | 'encore' | 'warmup'

export type SetEntry = BaseRecord & {
  workoutId: ID
  exerciseId: ID
  position: number
  /** Sempre em kg. A conversão para lb acontece só na hora de exibir. */
  weightKg: number
  reps: number
  type: SetType
  /** `null` = série ainda não concluída. */
  completedAt: Timestamp | null
}
