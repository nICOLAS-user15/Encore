import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { DEFAULT_SETTINGS, getSettings, type AppSettings } from './settingsRepository'

/**
 * Current settings, always up to date (useLiveQuery).
 * While the database has not answered, returns the defaults with `loaded: false`.
 */
export function useSettings(): { settings: AppSettings; loaded: boolean } {
  const settings = useLiveQuery(() => getSettings(db), [])
  return { settings: settings ?? DEFAULT_SETTINGS, loaded: settings !== undefined }
}
