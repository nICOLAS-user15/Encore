import type { Transaction } from 'dexie'
import { SETTINGS_ID, type ID, type Language } from '../types'

/*
 * Migração do banco da versão 2 para a 3: divisões de treino.
 *
 * Roda UMA vez, sozinha, na primeira abertura depois da atualização, dentro de
 * uma transação (ou tudo dá certo, ou nada muda).
 *
 * O que muda:
 * 1. Nasce a tabela `splits` (divisões: Upper/Lower, PPL...).
 * 2. Toda rotina ganha o campo `splitId`. As rotinas que o usuário já tem vão
 *    para UMA divisão criada aqui. Nenhuma rotina, exercício ou treino é apagado.
 *
 * O id da divisão criada é FIXO (como os ids do seed). Assim, o aparelho que
 * migrou e um backup antigo convertido (veja backup.ts) falam da MESMA divisão:
 * importar um no outro não cria duas divisões iguais.
 */
export const LEGACY_SPLIT_ID: ID = 'dbb9c1b2-9102-4b78-8080-425be21939b1'

/**
 * Nome da divisão criada para as rotinas que já existiam. Se todas se chamam
 * "Upper..." ou "Lower...", a divisão leva o nome "Upper / Lower"; senão, um
 * nome neutro (o usuário renomeia depois).
 */
export function legacySplitName(routineNames: string[], language: Language): string {
  const isUpperLower =
    routineNames.length > 0 &&
    routineNames.every((name) => /^(upper|lower)\b/i.test(name.trim()))
  if (isUpperLower) {
    return 'Upper / Lower'
  }
  return language === 'en' ? 'My routines' : 'Minhas rotinas'
}

/** Formato mínimo de uma rotina antes da versão 3 (sem `splitId`). */
type LegacyRoutine = {
  name: string
  splitId?: ID
  deletedAt: number | null
  updatedAt: number
}

/** O mesmo código serve ao banco (esta migração) e ao arquivo de backup antigo. */
export function legacySplitRecord(name: string, now: number) {
  return {
    id: LEGACY_SPLIT_ID,
    name,
    order: 0,
    notes: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export async function upgradeToV3(tx: Transaction): Promise<void> {
  const routines = tx.table<LegacyRoutine>('routines')
  const active = (await routines.toArray()).filter(
    (routine) => routine.deletedAt === null,
  )
  if (active.length === 0) {
    // Nada a organizar: quem começa do zero cria as próprias divisões.
    return
  }

  const settings = await tx.table<{ language?: Language }>('settings').get(SETTINGS_ID)
  const language: Language = settings?.language === 'en' ? 'en' : 'pt'
  const now = Date.now()

  await tx.table('splits').add(
    legacySplitRecord(
      legacySplitName(
        active.map((r) => r.name),
        language,
      ),
      now,
    ),
  )

  // `updatedAt` muda: a sincronização futura (e a importação de backup) precisam
  // enxergar que esta rotina foi alterada.
  await routines.toCollection().modify((routine) => {
    routine.splitId = LEGACY_SPLIT_ID
    routine.updatedAt = now
  })
}
