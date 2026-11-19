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
 * Backup as a JSON file: the only way (for now) to avoid losing workouts
 * when switching devices, and to move data from the computer to the phone.
 */

/** All the tables that go in the backup. */
const TABLES = BACKUP_TABLES
type TableName = (typeof TABLES)[number]

/** Above this, the file cannot be an Encore backup (avoids freezing the screen reading junk). */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

export type Backup = {
  /** Marker that identifies the file as an Encore backup. */
  format: 'encore-backup'
  /** Schema version that produced the file. */
  schemaVersion: number
  exportedAt: number
  tables: Record<TableName, BaseRecord[]>
}

/** Errors the screen knows how to explain to the user. */
export class BackupError extends Error {
  readonly reason: 'invalid' | 'newerVersion'

  constructor(reason: 'invalid' | 'newerVersion') {
    super(reason)
    this.reason = reason
  }
}

/**
 * Reads ALL rows, including deleted ones (soft delete): that way, a
 * deletion made on one device also reaches the other on import.
 */
export async function exportBackup(db: EncoreDB): Promise<Backup> {
  // A single read transaction: a workout finished during the export does not
  // produce a file with the workout but without its last sets.
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
 * Backup from version 2 -> 3 (workout splits). Does to the file what the
 * v3 migration does to the database: the routines go to a split with the SAME fixed
 * id. That way, importing this file on a device that already migrated does not create a
 * second identical split. Mutates the received object.
 */
function upgradeBackupFromV2(backup: Backup): void {
  const tables = backup.tables as Record<string, unknown> | undefined
  if (!tables || !Array.isArray(tables.routines)) {
    return // broken file: the validation right below rejects it
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

/** Converts the file text into a valid Backup, or throws BackupError. */
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
  // Backup was born in version 2: before that there is no valid file.
  if (backup.schemaVersion < 2) {
    throw new BackupError('invalid')
  }
  // File from a version older than the current one: converts before validating.
  if (backup.schemaVersion === 2) {
    upgradeBackupFromV2(backup as Backup)
  }
  // Checks and copies each row (field by field): a malformed file is rejected entirely.
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

/** Exercise from the file that the device already has under another id → the device's id. */
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
 * There can be only one workout in progress. If the device already has one, the ones
 * from the file come in FINISHED in the history (nothing is lost and none becomes a "ghost",
 * outside the history and outside the Workout screen). With no open workout here, only the
 * most recent one in the file stays open. Mutates the received rows.
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
 * Merges the backup with what already exists on the device, record by record (by id):
 * - does not exist here: it comes in;
 * - exists: the version with the most recent `updatedAt` wins.
 * Nothing newer is overwritten. This is the same rule future sync will use.
 *
 * Exceptions that avoid duplicated or odd data (see the functions above): an exercise
 * with the same name as one that already exists here uses the device's (the file's routines
 * and sets are relinked to it), and an extra workout in progress comes in finished.
 *
 * Exception to the "writes only through repository.ts" rule: the backup must preserve the
 * file's original `id` and `updatedAt`.
 */
export async function importBackup(db: EncoreDB, backup: Backup): Promise<ImportResult> {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
  const tables = TABLES.map((name) => db.table<BaseRecord, string>(name))

  await db.transaction('rw', tables, async () => {
    const exerciseRemap = await mapDuplicateExercises(db, backup.tables.exercises)
    // Shallow copy of the rows: the file that was read is not changed.
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

/** File name: encore-backup-2026-11-18.json */
export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `encore-backup-${day}.json`
}

/**
 * Delivers the file to the user. On mobile, uses the system share sheet
 * (save to Files, Drive, send on WhatsApp...). Where it does not exist, downloads the file.
 *
 * Returns `false` if the user closed the share sheet without choosing anything:
 * then there was no backup (and the screen must not say there was).
 */
export async function saveBackupFile(backup: Backup): Promise<boolean> {
  const json = JSON.stringify(backup)
  const file = new File([json], backupFileName(), { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (error) {
      // User closed the share sheet: not an error, but nothing was saved either.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false
      }
      // Any other failure: tries the regular download below.
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  // Outside the DOM, some browsers ignore the click; and revoking the URL right after
  // can cancel the download before it starts.
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return true
}
