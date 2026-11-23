import type { EncoreDB } from '../../db/db'
import { createRecord, restoreRecord, softDelete } from '../../db/repository'
import type { BodyWeight, ID, Timestamp } from '../../db/types'

/** Everything that WRITES body weight. Goes through the repository, like the rest of the app. */

/** Logs a measurement (now, unless another moment is given). */
export function logBodyWeight(
  db: EncoreDB,
  weightKg: number,
  measuredAt: Timestamp = Date.now(),
): Promise<BodyWeight> {
  return createRecord(db.bodyWeights, { measuredAt, weightKg })
}

/** Deletes a measurement (soft). Returns its id, for "Desfazer" (`restoreBodyWeight`). */
export async function deleteBodyWeight(db: EncoreDB, id: ID): Promise<ID> {
  await softDelete(db.bodyWeights, id)
  return id
}

export function restoreBodyWeight(db: EncoreDB, id: ID): Promise<void> {
  return restoreRecord(db.bodyWeights, id)
}
