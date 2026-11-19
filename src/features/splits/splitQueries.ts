import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { Split } from '../../db/types'

/** Active splits, in tab order (uses the `order` index). */
export async function listSplits(db: EncoreDB): Promise<Split[]> {
  return db.splits.orderBy('order').filter(isActive).toArray()
}
