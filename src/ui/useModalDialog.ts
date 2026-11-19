import { useEffect, useRef } from 'react'

/**
 * Binds a native `<dialog>` to React's `open` state.
 *
 * Why `<dialog>` + `showModal()` instead of a <div> over the screen?
 * The browser already solves, for free, what used to be missing:
 * - focus moves into the sheet and returns to the origin button on close;
 * - the rest of the page becomes inert (screen readers and touches do not reach it);
 * - Esc (and, on Chrome for Android, the back gesture) closes the sheet;
 * - the sheet sits in the "top layer", above everything, without fighting z-index.
 *
 * Usage: `const ref = useModalDialog(open)` e `<dialog ref={ref} onClose={...}>`.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return ref
}
