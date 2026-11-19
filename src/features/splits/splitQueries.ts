import type { EncoreDB } from '../../db/db'
import { isActive } from '../../db/repository'
import type { Split } from '../../db/types'

/** Divisões ativas, na ordem das abas (usa o índice `order`). */
export async function listSplits(db: EncoreDB): Promise<Split[]> {
  return db.splits.orderBy('order').filter(isActive).toArray()
}
