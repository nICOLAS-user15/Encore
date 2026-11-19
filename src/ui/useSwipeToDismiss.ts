import { useEffect, useRef, type RefObject } from 'react'

type Direction = 'down' | 'left'

/** Distance (px) the finger must travel in the dismiss direction to close the panel. */
const DISMISS_DISTANCE = 80

type SwipeOptions = {
  /** The panel that follows the finger. */
  panel: RefObject<HTMLElement | null>
  /** The area that is dragged (the panel itself, or only its header when the body scrolls). */
  handle: RefObject<HTMLElement | null>
  direction: Direction
  /** The panel only exists while open: the listeners are attached then. */
  open: boolean
  onDismiss: () => void
}

/**
 * Drag-to-close for panels: a sheet is dismissed by dragging it down, the side menu by
 * dragging it to the left. While the finger moves, the panel follows it (direct feedback);
 * if released before the threshold, it springs back.
 *
 * The listeners are attached natively in an effect (not as JSX props), because they read
 * refs and must not run during render.
 */
export function useSwipeToDismiss({
  panel,
  handle,
  direction,
  open,
  onDismiss,
}: SwipeOptions) {
  // Always call the latest `onDismiss` without re-attaching the listeners on every render.
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })

  useEffect(() => {
    const handleElement = handle.current
    const panelElement = panel.current
    if (!open || handleElement === null || panelElement === null) {
      return
    }

    let start: { x: number; y: number } | null = null

    /** How far the finger went in the dismiss direction (negative = the wrong way). */
    function travelled(touch: Touch): number {
      if (start === null) {
        return 0
      }
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const main = direction === 'down' ? dy : -dx
      const cross = direction === 'down' ? dx : dy
      // Mostly sideways on a sheet (or mostly vertical on the menu) is a scroll or a tap.
      return Math.abs(main) > Math.abs(cross) ? main : 0
    }

    function follow(distance: number, animated: boolean) {
      if (panelElement === null) {
        return
      }
      panelElement.style.transition = animated ? 'transform 160ms ease-out' : 'none'
      panelElement.style.transform =
        distance <= 0
          ? ''
          : direction === 'down'
            ? `translateY(${distance}px)`
            : `translateX(${-distance}px)`
    }

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY }
    }
    const onMove = (event: TouchEvent) => follow(travelled(event.touches[0]), false)
    const onEnd = (event: TouchEvent) => {
      const distance = travelled(event.changedTouches[0])
      start = null
      if (distance >= DISMISS_DISTANCE) {
        dismiss.current()
      } else {
        follow(0, true)
      }
    }
    const onCancel = () => {
      start = null
      follow(0, true)
    }

    handleElement.addEventListener('touchstart', onStart, { passive: true })
    handleElement.addEventListener('touchmove', onMove, { passive: true })
    handleElement.addEventListener('touchend', onEnd)
    handleElement.addEventListener('touchcancel', onCancel)
    return () => {
      handleElement.removeEventListener('touchstart', onStart)
      handleElement.removeEventListener('touchmove', onMove)
      handleElement.removeEventListener('touchend', onEnd)
      handleElement.removeEventListener('touchcancel', onCancel)
    }
  }, [open, direction, panel, handle])
}
