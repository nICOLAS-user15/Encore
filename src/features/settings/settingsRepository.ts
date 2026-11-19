import type { EncoreDB } from '../../db/db'
import { SETTINGS_ID, type Equipment, type Settings } from '../../db/types'

/** As preferências em si (sem os campos automáticos do registro). */
export type AppSettings = Pick<
  Settings,
  | 'language'
  | 'restSeconds'
  | 'autoStartRest'
  | 'keepScreenOn'
  | 'restSound'
  | 'weightStepsKg'
  | 'lastBackupAt'
  | 'activeSplitId'
>

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt',
  restSeconds: 90,
  autoStartRest: true,
  keepScreenOn: true,
  restSound: true,
  // Saltos comuns em academias brasileiras: anilhas de 1,25 kg por lado (2,5 na
  // barra), halteres de 2 em 2 kg, pilhas de máquina de 5 em 5, kettlebells de 4 em 4.
  weightStepsKg: {
    barbell: 2.5,
    dumbbell: 2,
    machine: 5,
    cable: 5,
    kettlebell: 4,
  },
  lastBackupAt: null,
  activeSplitId: null,
}

/** Opções de duração do descanso oferecidas na tela de Configurações (segundos). */
export const REST_OPTIONS = [60, 90, 120, 180] as const

/** Opções de salto de carga oferecidas nas Configurações (kg). */
export const WEIGHT_STEP_OPTIONS = [1, 1.25, 2, 2.5, 4, 5] as const

/** Peso corporal com carga extra (cinto, colete): o −/+ do editor anda de 2,5 em 2,5 kg. */
export const BODYWEIGHT_STEP_KG = 2.5

/** Salto dos botões −/+ de carga para um equipamento. */
export function weightStepFor(settings: AppSettings, equipment: Equipment): number {
  return equipment === 'bodyweight'
    ? BODYWEIGHT_STEP_KG
    : settings.weightStepsKg[equipment]
}

/** Configurações salvas, ou as padrão se o usuário nunca mudou nada. */
export async function getSettings(db: EncoreDB): Promise<AppSettings> {
  const row = await db.settings.get(SETTINGS_ID)
  if (!row) {
    return DEFAULT_SETTINGS
  }
  // `??`: registros salvos antes de um campo existir não têm esse campo;
  // nesse caso vale o padrão (sem precisar de migração).
  return {
    language: row.language ?? DEFAULT_SETTINGS.language,
    restSeconds: row.restSeconds ?? DEFAULT_SETTINGS.restSeconds,
    autoStartRest: row.autoStartRest ?? DEFAULT_SETTINGS.autoStartRest,
    keepScreenOn: row.keepScreenOn ?? DEFAULT_SETTINGS.keepScreenOn,
    restSound: row.restSound ?? DEFAULT_SETTINGS.restSound,
    // Objeto: junta o padrão com o salvo, para um equipamento novo também ter valor.
    weightStepsKg: { ...DEFAULT_SETTINGS.weightStepsKg, ...row.weightStepsKg },
    lastBackupAt: row.lastBackupAt ?? null,
    activeSplitId: row.activeSplitId ?? null,
  }
}

/**
 * Salva uma ou mais preferências.
 * Exceção à regra "toda escrita passa por repository.ts": as configurações são
 * um registro único com id FIXO (não um UUID novo), então são gravadas aqui.
 */
export async function updateSettings(
  db: EncoreDB,
  changes: Partial<AppSettings>,
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const existing = await db.settings.get(SETTINGS_ID)
    const now = Date.now()
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      ...existing,
      ...changes,
      id: SETTINGS_ID,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    })
  })
}
