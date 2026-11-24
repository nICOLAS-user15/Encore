import type { Messages } from '../../i18n/pt'
import type { ExportResult } from './useBackupExport'

/** What to tell after an export; `null` = the share sheet was closed, nothing to say. */
export function exportMessage(result: ExportResult, t: Messages): string | null {
  switch (result) {
    case 'saved':
      return t.settings.exported
    case 'unconfirmed':
      return t.settings.exportUnconfirmed
    case 'failed':
      return t.settings.exportFailed
    case 'cancelled':
      return null
  }
}
