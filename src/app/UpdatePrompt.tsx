import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n/context'
import { DockItem } from '../ui/BottomDock'
import { Button } from '../ui/Button'
import { applyUpdate } from './applyUpdate'

/**
 * Registra o service worker e, quando existe uma versão nova do app já baixada,
 * mostra um aviso na doca acima das abas. Nada muda até o usuário tocar em "Atualizar".
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
        className="flex items-center justify-between gap-3 border-2 border-text bg-surface p-3"
      >
        <p className="text-sm font-semibold">{t.update.available}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
            {t.update.later}
          </Button>
          {/* Sem vermelho: o aviso aparece por cima de telas que já têm sua ação principal. */}
          <Button onClick={() => void applyUpdate(updateServiceWorker)}>
            {t.update.update}
          </Button>
        </div>
      </div>
    </DockItem>
  )
}
