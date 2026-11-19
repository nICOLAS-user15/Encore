import { useRef, useState } from 'react'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { Section } from '../../ui/Section'
import {
  BackupError,
  MAX_BACKUP_BYTES,
  exportBackup,
  importBackup,
  parseBackup,
  saveBackupFile,
} from './backup'
import { daysSince } from './backupReminder'
import { updateSettings } from './settingsRepository'
import { useSettings } from './useSettings'

/** Export and import the backup (JSON file). */
export function BackupSection() {
  const { t } = useI18n()
  const { settings, loaded } = useSettings()
  const now = useNow(60_000)
  // useRef keeps a reference to the hidden <input type="file">, to open it from the button.
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const backup = await exportBackup(db)
      // Self-check: the file must restore. A backup that only fails on the day it is
      // needed is worse than none (it silences the reminder). Throws → "exportFailed".
      parseBackup(JSON.stringify(backup))
      const result = await saveBackupFile(backup)
      // Only a confirmed save counts as a backup (and quiets the reminder).
      if (result === 'saved') {
        await updateSettings(db, { lastBackupAt: Date.now() })
        setMessage(t.settings.exported)
      } else if (result === 'unconfirmed') {
        setMessage(t.settings.exportUnconfirmed)
      }
    } catch {
      setMessage(t.settings.exportFailed)
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File) {
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage(t.settings.importInvalid)
      return
    }
    setBusy(true)
    try {
      const result = await importBackup(db, parseBackup(await file.text()))
      setMessage(t.settings.imported(result.added, result.updated))
    } catch (error) {
      if (error instanceof BackupError && error.reason === 'newerVersion') {
        setMessage(t.settings.importNewer)
      } else if (error instanceof BackupError) {
        setMessage(t.settings.importInvalid)
      } else {
        // Database failure (e.g. no space): the import is a transaction, nothing was written.
        setMessage(t.settings.importFailed)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title={t.settings.backup} hint={t.settings.backupHint}>
      {/* min-h: the space already exists while loading, so nothing "jumps" on screen. */}
      <p className="mb-3 min-h-5 text-sm font-semibold">
        {loaded &&
          t.settings.lastBackup(
            settings.lastBackupAt === null ? null : daysSince(settings.lastBackupAt, now),
          )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={() => void handleExport()}>
          {t.settings.exportBackup}
        </Button>
        <Button disabled={busy} onClick={() => fileInput.current?.click()}>
          {t.settings.importBackup}
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label={t.settings.importBackup}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Clears the field: choosing the same file again fires onChange again.
          event.target.value = ''
          if (file) {
            void handleFile(file)
          }
        }}
      />
      {/* role="status": screen readers announce the result. */}
      <p role="status" className="mt-3 min-h-6 text-sm">
        {message}
      </p>
    </Section>
  )
}
