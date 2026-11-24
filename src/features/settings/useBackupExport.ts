import { useState } from 'react'
import { db } from '../../db/db'
import { exportBackup, parseBackup, saveBackupFile, type SaveResult } from './backup'
import { updateSettings } from './settingsRepository'

export type ExportResult = SaveResult | 'failed'

/**
 * Exports the backup file, shared by Settings and the post-workout summary. The file is
 * checked before it leaves (a backup that cannot be restored is worse than none: it
 * quiets the reminders), and only a confirmed save writes `lastBackupAt`.
 */
export function useBackupExport() {
  const [busy, setBusy] = useState(false)

  async function exportFile(): Promise<ExportResult> {
    setBusy(true)
    try {
      const backup = await exportBackup(db)
      parseBackup(JSON.stringify(backup)) // throws → "failed"
      const result = await saveBackupFile(backup)
      if (result === 'saved') {
        await updateSettings(db, { lastBackupAt: Date.now() })
      }
      return result
    } catch {
      return 'failed'
    } finally {
      setBusy(false)
    }
  }

  return { busy, exportFile }
}
