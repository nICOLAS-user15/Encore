import { SCHEMA_VERSION, type EncoreDB } from '../../db/db'
import {
  LEGACY_SPLIT_ID,
  legacySplitName,
  legacySplitRecord,
} from '../../db/migrations/v3'
import type { BaseRecord, ID, Language } from '../../db/types'
import { nameKey } from '../../lib/text'
import { BACKUP_TABLES, sanitizeRow } from './backupSchema'

/*
 * Backup em arquivo JSON: a única forma (por enquanto) de não perder os treinos
 * ao trocar de aparelho, e de levar os dados do computador para o celular.
 */

/** Todas as tabelas que vão no backup. */
const TABLES = BACKUP_TABLES
type TableName = (typeof TABLES)[number]

/** Acima disto o arquivo não pode ser um backup do Encore (evita travar a tela lendo lixo). */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

export type Backup = {
  /** Marca que identifica o arquivo como backup do Encore. */
  format: 'encore-backup'
  /** Versão do schema que gerou o arquivo. */
  schemaVersion: number
  exportedAt: number
  tables: Record<TableName, BaseRecord[]>
}

/** Erros que a tela sabe explicar ao usuário. */
export class BackupError extends Error {
  readonly reason: 'invalid' | 'newerVersion'

  constructor(reason: 'invalid' | 'newerVersion') {
    super(reason)
    this.reason = reason
  }
}

/**
 * Lê TODAS as linhas, inclusive as excluídas (exclusão lógica): assim, uma
 * exclusão feita num aparelho também chega no outro ao importar.
 */
export async function exportBackup(db: EncoreDB): Promise<Backup> {
  // Uma transação de leitura só: um treino finalizado durante a exportação não
  // gera um arquivo com o treino e sem as últimas séries.
  const entries = await db.transaction(
    'r',
    TABLES.map((name) => db.table(name)),
    () =>
      Promise.all(
        TABLES.map(
          async (name) => [name, await db.table<BaseRecord>(name).toArray()] as const,
        ),
      ),
  )
  return {
    format: 'encore-backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    tables: Object.fromEntries(entries) as Backup['tables'],
  }
}

/**
 * Backup da versão 2 -> 3 (divisões de treino). Faz com o arquivo o mesmo que a
 * migração v3 faz com o banco: as rotinas vão para uma divisão com o MESMO id
 * fixo. Assim, importar este arquivo num aparelho que já migrou não cria uma
 * segunda divisão igual. Altera o objeto recebido.
 */
function upgradeBackupFromV2(backup: Backup): void {
  const tables = backup.tables as Record<string, unknown> | undefined
  if (!tables || !Array.isArray(tables.routines)) {
    return // arquivo estragado: a validação logo abaixo recusa
  }

  type RoutineRow = Partial<BaseRecord> & { name?: unknown; splitId?: ID }
  const routines = tables.routines as RoutineRow[]
  const active = routines.filter(
    (routine) =>
      typeof routine === 'object' &&
      routine !== null &&
      routine.deletedAt === null &&
      typeof routine.name === 'string',
  )

  tables.splits = []
  if (active.length === 0) {
    return
  }

  const settingsRows = Array.isArray(tables.settings) ? tables.settings : []
  const language: Language =
    (settingsRows[0] as { language?: Language } | undefined)?.language === 'en'
      ? 'en'
      : 'pt'
  const name = legacySplitName(
    active.map((routine) => routine.name as string),
    language,
  )
  tables.splits = [legacySplitRecord(name, backup.exportedAt)]

  for (const routine of routines) {
    if (typeof routine === 'object' && routine !== null) {
      routine.splitId ??= LEGACY_SPLIT_ID
    }
  }
}

/** Converte o texto do arquivo num Backup válido, ou lança BackupError. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('invalid')
  }

  const backup = data as Partial<Backup>
  if (backup?.format !== 'encore-backup' || typeof backup.schemaVersion !== 'number') {
    throw new BackupError('invalid')
  }
  if (backup.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('newerVersion')
  }
  // O backup nasceu na versão 2: antes disso não existe arquivo válido.
  if (backup.schemaVersion < 2) {
    throw new BackupError('invalid')
  }
  // Arquivo de uma versão mais antiga que a atual: converte antes de validar.
  if (backup.schemaVersion === 2) {
    upgradeBackupFromV2(backup as Backup)
  }
  // Confere e copia cada linha (campo a campo): arquivo malformado é recusado inteiro.
  const tables = {} as Backup['tables']
  for (const name of TABLES) {
    const rows: unknown = backup.tables?.[name]
    if (!Array.isArray(rows)) {
      throw new BackupError('invalid')
    }
    tables[name] = rows.map((row) => {
      const clean = sanitizeRow(name, row)
      if (clean === null) {
        throw new BackupError('invalid')
      }
      return clean
    })
  }
  return { ...(backup as Backup), tables }
}

export type ImportResult = { added: number; updated: number; skipped: number }

/** Exercício do arquivo que o aparelho já tem com outro id → o id do aparelho. */
async function mapDuplicateExercises(
  db: EncoreDB,
  incoming: BaseRecord[],
): Promise<Map<ID, ID>> {
  type ExerciseRow = BaseRecord & { names: Record<Language, string> }
  const localByName = new Map<string, ID>()
  const localIds = new Set<ID>()
  for (const local of await db.exercises.toArray()) {
    localIds.add(local.id)
    if (local.deletedAt === null) {
      for (const name of [local.names.pt, local.names.en]) {
        localByName.set(nameKey(name), local.id)
      }
    }
  }

  const remap = new Map<ID, ID>()
  for (const row of incoming as ExerciseRow[]) {
    if (row.deletedAt !== null || localIds.has(row.id)) {
      continue
    }
    const sameName = [row.names.pt, row.names.en]
      .map((name) => localByName.get(nameKey(name)))
      .find((localId) => localId !== undefined)
    if (sameName !== undefined) {
      remap.set(row.id, sameName)
    }
  }
  return remap
}

/**
 * Só pode haver um treino em andamento. Se o aparelho já tem um, os do arquivo
 * entram FINALIZADOS no histórico (nada se perde e nenhum fica "fantasma", fora
 * do histórico e fora da tela Treino). Sem treino aberto aqui, fica aberto só o
 * mais recente do arquivo. Altera as linhas recebidas.
 */
async function closeExtraOpenWorkouts(
  db: EncoreDB,
  incoming: BaseRecord[],
): Promise<void> {
  type WorkoutRow = BaseRecord & {
    startedAt: number
    endedAt: number | null
    timerStartedAt: number | null
    timerStoppedAt: number | null
  }
  const localOpen = (await db.workouts.toArray()).find(
    (workout) => workout.deletedAt === null && workout.endedAt === null,
  )
  const open = (incoming as WorkoutRow[]).filter(
    (row) => row.deletedAt === null && row.endedAt === null && row.id !== localOpen?.id,
  )
  const keep = localOpen
    ? null
    : open.reduce<WorkoutRow | null>(
        (latest, row) =>
          latest === null || row.startedAt > latest.startedAt ? row : latest,
        null,
      )

  for (const row of open) {
    if (row !== keep) {
      row.endedAt = Math.max(row.startedAt, row.updatedAt)
      if (row.timerStartedAt !== null && row.timerStoppedAt === null) {
        row.timerStoppedAt = row.endedAt
      }
    }
  }
}

/**
 * Junta o backup com o que já existe no aparelho, registro por registro (pelo id):
 * - não existe aqui: entra;
 * - existe: fica a versão com o `updatedAt` mais recente.
 * Nada mais novo é sobrescrito. É a mesma regra que a sincronização futura vai usar.
 *
 * Exceções que evitam dados duplicados ou estranhos (ver as funções acima): exercício
 * com o mesmo nome de um que já existe aqui usa o do aparelho (as rotinas e séries do
 * arquivo são religadas a ele), e treino em andamento extra entra finalizado.
 *
 * Exceção à regra "escrita só pelo repository.ts": o backup precisa preservar o `id` e
 * o `updatedAt` originais do arquivo.
 */
export async function importBackup(db: EncoreDB, backup: Backup): Promise<ImportResult> {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
  const tables = TABLES.map((name) => db.table<BaseRecord, string>(name))

  await db.transaction('rw', tables, async () => {
    const exerciseRemap = await mapDuplicateExercises(db, backup.tables.exercises)
    // Cópia rasa das linhas: o arquivo lido não é alterado.
    const rows = Object.fromEntries(
      TABLES.map((name) => [name, backup.tables[name].map((row) => ({ ...row }))]),
    ) as Backup['tables']
    await closeExtraOpenWorkouts(db, rows.workouts)

    for (const name of TABLES) {
      const table = db.table<BaseRecord, string>(name)
      for (const incoming of rows[name]) {
        if (name === 'exercises' && exerciseRemap.has(incoming.id)) {
          result.skipped++
          continue
        }
        if (name === 'routineExercises' || name === 'setEntries') {
          const link = incoming as BaseRecord & { exerciseId: ID }
          link.exerciseId = exerciseRemap.get(link.exerciseId) ?? link.exerciseId
        }
        const current = await table.get(incoming.id)
        if (!current) {
          await table.add(incoming)
          result.added++
        } else if (incoming.updatedAt > current.updatedAt) {
          await table.put(incoming)
          result.updated++
        } else {
          result.skipped++
        }
      }
    }
  })
  return result
}

/** Nome do arquivo: encore-backup-2026-11-18.json */
export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `encore-backup-${day}.json`
}

/**
 * Entrega o arquivo ao usuário. No celular, usa a tela de compartilhar do sistema
 * (salvar em Arquivos, Drive, mandar no WhatsApp...). Onde não existir, baixa o arquivo.
 *
 * Devolve `false` se o usuário fechou a tela de compartilhar sem escolher nada:
 * aí não houve backup (e a tela não pode dizer que houve).
 */
export async function saveBackupFile(backup: Backup): Promise<boolean> {
  const json = JSON.stringify(backup)
  const file = new File([json], backupFileName(), { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (error) {
      // Usuário fechou a tela de compartilhar: não é erro, mas também não salvou.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false
      }
      // Qualquer outra falha: tenta o download comum abaixo.
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  // Fora do DOM, alguns navegadores ignoram o clique; e revogar a URL logo em seguida
  // pode cancelar o download antes de começar.
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return true
}
