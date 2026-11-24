import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ID } from '../../db/types'
import { useAction } from '../../ui/toastContext'
import { RirPicker } from './RirPicker'
import { setSetRir } from './workoutActions'

/**
 * The reps-in-reserve question under the rest bar, for the set that was just completed.
 * Reads the set live, so a value chosen here or in the set editor shows the same.
 */
export function RestRir({ setId }: { setId: ID }) {
  const run = useAction()
  const set = useLiveQuery(() => db.setEntries.get(setId), [setId])

  // Loading, or the set was deleted/un-completed meanwhile: nothing to ask.
  if (!set || set.deletedAt !== null || set.completedAt === null) {
    return null
  }
  return (
    <div className="border-2 border-t-0 border-text bg-surface-high px-3 pb-3">
      <RirPicker
        value={set.rir ?? null}
        onChange={(rir) => void run(() => setSetRir(db, setId, rir))}
      />
    </div>
  )
}
