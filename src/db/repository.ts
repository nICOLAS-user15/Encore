import type { Table } from 'dexie'
import type { BaseRecord, ID, NewRecord } from './types'

/*
 * Generic write functions. Every write goes through here to guarantee
 * that `id`, `createdAt`, `updatedAt` and `deletedAt` are always filled in
 * the same way, in any table.
 */

/** Automatic fields of a new record. */
export function newBaseRecord(now: number = Date.now()): BaseRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** Inserts a new record and returns the full record (with id and dates). */
export async function createRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  data: NewRecord<T>,
): Promise<T> {
  // TypeScript cannot prove that "data + base fields" form a T
  // when T is generic, hence the `as T`. Both halves are typed above.
  const record = { ...data, ...newBaseRecord() } as T
  await table.add(record)
  return record
}

/**
 * Reads and writes the record in a single transaction: two calls in a row (e.g. double tap)
 * do not read the same old state and overwrite each other. Inside another transaction,
 * Dexie simply joins it.
 */
async function modifyRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  change: (record: T, now: number) => T,
): Promise<void> {
  await table.db.transaction('rw', table, async () => {
    const record = await table.get(id)
    if (!record) {
      throw new Error(`Record ${id} not found`)
    }
    await table.put(change(record, Date.now()))
  })
}

/** Updates fields of a record and renews `updatedAt`. */
export async function updateRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  changes: Partial<NewRecord<T>>,
): Promise<void> {
  await updateRecordWith(table, id, () => changes)
}

/**
 * Like `updateRecord`, but the new fields depend on the CURRENT value of the record
 * (e.g. toggling "completed"). Reading and writing happen in the same transaction.
 */
export async function updateRecordWith<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  changesFrom: (current: T) => Partial<NewRecord<T>>,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    ...changesFrom(record),
    updatedAt: now,
  }))
}

/** Soft delete: sets `deletedAt` instead of deleting the row. */
export async function softDelete<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    deletedAt: now,
    updatedAt: now,
  }))
}

/** Undoes a soft delete ("Undo" button). New `updatedAt`: it beats the tombstone during sync. */
export async function restoreRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    deletedAt: null,
    updatedAt: now,
  }))
}

/** `true` if the record was not deleted. Use in `.filter(isActive)`. */
export function isActive(record: BaseRecord): boolean {
  return record.deletedAt === null
}
