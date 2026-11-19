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

/** Exportar e importar o backup (arquivo JSON). */
export function BackupSection() {
  const { t } = useI18n()
  const { settings, loaded } = useSettings()
  const now = useNow(60_000)
  // useRef guarda uma referência ao <input type="file"> escondido, para abri-lo pelo botão.
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const saved = await saveBackupFile(await exportBackup(db))
      // Fechou a tela de compartilhar sem escolher nada: não houve backup.
      if (saved) {
        await updateSettings(db, { lastBackupAt: Date.now() })
        setMessage(t.settings.exported)
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
        // Falha do banco (ex.: sem espaço): a importação é uma transação, nada foi gravado.
        setMessage(t.settings.importFailed)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title={t.settings.backup} hint={t.settings.backupHint}>
      {/* min-h: o espaço já existe enquanto carrega, então nada "pula" na tela. */}
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
          // Limpa o campo: escolher o mesmo arquivo de novo dispara onChange outra vez.
          event.target.value = ''
          if (file) {
            void handleFile(file)
          }
        }}
      />
      {/* role="status": leitores de tela anunciam o resultado. */}
      <p role="status" className="mt-3 min-h-6 text-sm">
        {message}
      </p>
    </Section>
  )
}
