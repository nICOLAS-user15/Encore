import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ID, Split } from '../../db/types'
import { updateSettings } from '../settings/settingsRepository'
import { useSettings } from '../settings/useSettings'
import { listSplits } from './splitQueries'
import { resolveActiveSplit } from './splitUtils'

type UseSplits = {
  /** `undefined` while the database has not answered yet. */
  splits: Split[] | undefined
  /** The split selected in the tabs (`null` if none exists). */
  active: Split | null
  /**
   * Selects a split: it is saved and applies to the Treino and Rotinas tabs. Returns a
   * promise that finishes when the choice has been written: whoever is about to switch
   * screens right after should wait for it, so the new screen already opens on the right split.
   */
  select: (splitId: ID) => Promise<void>
}

/**
 * The splits and which one is selected. The selection is one for the whole app:
 * switching the tab on the Treino screen also switches it on Rotinas (and vice versa).
 */
export function useSplits(): UseSplits {
  const loadedSplits = useLiveQuery(() => listSplits(db), [])
  const { settings, loaded } = useSettings()
  // Only counts as "loaded" when BOTH reads have answered: before reading the
  // settings, the default value ("the first split") would show for a moment
  // and then the screen would jump to the split the user actually chose.
  const splits = loaded ? loadedSplits : undefined
  return {
    splits,
    active: splits ? resolveActiveSplit(splits, settings.activeSplitId) : null,
    select: (splitId) => updateSettings(db, { activeSplitId: splitId }),
  }
}
