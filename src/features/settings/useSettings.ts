import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { DEFAULT_SETTINGS, getSettings, type AppSettings } from './settingsRepository'

/**
 * Configurações atuais, sempre atualizadas (useLiveQuery).
 * Enquanto o banco não respondeu, devolve as padrão com `loaded: false`.
 */
export function useSettings(): { settings: AppSettings; loaded: boolean } {
  const settings = useLiveQuery(() => getSettings(db), [])
  return { settings: settings ?? DEFAULT_SETTINGS, loaded: settings !== undefined }
}
