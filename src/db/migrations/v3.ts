import type { Transaction } from 'dexie'
import { SETTINGS_ID, type ID, type Language } from '../types'

/*
 * Migration of the database from version 2 to 3: workout splits.
 *
 * Runs ONCE, on its own, on the first open after the update, inside
 * a transaction (either everything works, or nothing changes).
 *
 * What changes:
 * 1. The `splits` table is created (splits: Upper/Lower, PPL...).
 * 2. Every routine gets the `splitId` field. The routines the user already has go
 *    into ONE split created here. No routine, exercise or workout is deleted.
 *
 * The id of the created split is FIXED (like the seed ids). That way, the device that
 * migrated and an old converted backup (see backup.ts) refer to the SAME split:
 * importing one into the other does not create two identical splits.
 */
export const LEGACY_SPLIT_ID: ID = 'dbb9c1b2-9102-4b78-8080-425be21939b1'

/**
 * Name of the split created for the routines that already existed. If all are called
 * "Upper..." or "Lower...", the split is named "Upper / Lower"; otherwise, a
 * neutral name (the user renames it later).
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

/** Minimal shape of a routine before version 3 (without `splitId`). */
type LegacyRoutine = {
  name: string
  splitId?: ID
  deletedAt: number | null
  updatedAt: number
}

/** The same code serves the database (this migration) and the old backup file. */
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
    // Nothing to organize: whoever starts from scratch creates their own splits.
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

  // `updatedAt` changes: future sync (and backup import) need to
  // see that this routine was changed.
  await routines.toCollection().modify((routine) => {
    routine.splitId = LEGACY_SPLIT_ID
    routine.updatedAt = now
  })
}
