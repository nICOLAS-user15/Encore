import { useI18n } from '../i18n/context'
import { Button } from './Button'
import { Sheet } from './Sheet'

type ConfirmSheetProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  /** The action deletes something (discard, delete, remove): button without red. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks for confirmation before an important action (finish, discard, delete). */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { t } = useI18n()
  return (
    <Sheet open={open} title={title} onClose={onCancel}>
      <p className="mb-6 text-base leading-relaxed text-muted">{description}</p>
      <div className="flex flex-col gap-3">
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          fullWidth
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button fullWidth onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </Sheet>
  )
}
