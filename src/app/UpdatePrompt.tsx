import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n/context'
import { DockItem } from '../ui/BottomDock'
import { Button } from '../ui/Button'
import { applyUpdate } from './applyUpdate'

/**
 * Registers the service worker and, when there is a new app version already downloaded,
 * shows a notice in the dock above the tabs. Nothing changes until the user taps "Atualizar".
 */
export function UpdatePrompt() {
  const { t } = useI18n()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <DockItem>
      <div
        role="status"
        className="flex items-center justify-between gap-3 border-2 border-text bg-surface-high p-3 shadow-card"
      >
        <p className="text-sm font-semibold">{t.update.available}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
            {t.update.later}
          </Button>
          {/* No red: the notice shows over screens that already have their main action. */}
          <Button onClick={() => void applyUpdate(updateServiceWorker)}>
            {t.update.update}
          </Button>
        </div>
      </div>
    </DockItem>
  )
}
