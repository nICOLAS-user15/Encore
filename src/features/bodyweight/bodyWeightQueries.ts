import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { BodyWeight } from '../../db/types'

/** Measurements from oldest to newest (the `measuredAt` index), deleted ones left out. */
export function listBodyWeights(db: EncoreDB): Promise<BodyWeight[]> {
  return db.bodyWeights.orderBy('measuredAt').filter(isActive).toArray()
}
