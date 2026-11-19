import { useId, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { ArrowLeftIcon } from './icons'
import { useModalDialog } from './useModalDialog'

type SheetProps = {
  open: boolean
  title: string
  onClose: () => void
  /**
   * Does tapping outside the sheet close it? Default: yes. Sheets with typed input (set editor)
   * use `false`: a wrong tap with a sweaty hand must not throw the value away.
   */
  dismissOnBackdrop?: boolean
  children: ReactNode
}

/**
 * Sheet that slides up from the bottom of the screen (easy to reach with the thumb).
 * Closes by tapping outside, the ← arrow ("Voltar") or Esc.
 *
 * It is a native `<dialog>` (see useModalDialog). It fills the whole screen and is
 * transparent; the visible sheet is the <section> pinned to the bottom.
 */
export function Sheet({
  open,
  title,
  onClose,
  dismissOnBackdrop = true,
  children,
}: SheetProps) {
  const titleId = useId()
  const { t } = useI18n()
  const ref = useModalDialog(open)

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // The "close" event arrives from any path (Esc, back gesture, our
      // close()): we notify the parent, which keeps the state. Calling twice is harmless.
      onClose={onClose}
      // Tap outside the sheet: the target is the <dialog> itself (the transparent area).
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="m-0 size-full max-h-none max-w-none flex-col justify-end border-0 bg-transparent p-0 text-text backdrop:animate-fade-in backdrop:bg-background/85 open:flex"
    >
      {/* The content only exists while open: each opening starts from scratch (and slides up again). */}
      {open && (
        <section className="pb-safe mx-auto flex max-h-[92dvh] w-full max-w-xl animate-sheet-in flex-col border-t-4 border-text bg-surface">
          {/* Arrow on the left, like the "Voltar" of inner screens: same gesture, same place. */}
          <header className="flex items-center gap-1 border-b-2 border-line py-2 pr-4 pl-1">
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.back}
              className="flex size-12 shrink-0 items-center justify-center active:text-muted [&>svg]:size-6"
            >
              <ArrowLeftIcon />
            </button>
            <h2
              id={titleId}
              className="truncate font-display text-2xl font-bold uppercase"
            >
              {title}
            </h2>
          </header>
          {/* overscroll-contain: scrolling the sheet does not drag the page behind it. */}
          <div className="overflow-y-auto overscroll-contain p-4">{children}</div>
        </section>
      )}
    </dialog>
  )
}
