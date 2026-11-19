import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * "Dock": the fixed strip right above the tabs, where the notices that float
 * over the screen live (rest, new version, workout in progress).
 *
 * Before, each notice positioned itself in the same spot and one covered the other.
 * Now they are all "teleported" (createPortal) into ONE column container:
 * if two show up at the same time, they stack.
 */

/** The dock element. `undefined` = no provider (e.g. in single-component tests). */
const DockContext = createContext<HTMLElement | null | undefined>(undefined)

// pointer-events-none on the container: the dock's empty area does not "steal" touches from the screen.
// `*:` applies to direct children (each notice), which receive touches again
// and rise from the bottom when they appear (animate-dock-in).
const dockClasses =
  'pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 px-4 pb-3 *:pointer-events-auto *:mx-auto *:w-full *:max-w-xl *:animate-dock-in'

/** Creates the dock. Exists once, around the whole app (App.tsx). */
export function BottomDockProvider({ children }: { children: ReactNode }) {
  // We keep the element in state (via a function ref) so notices know when it exists.
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  return (
    <DockContext value={node}>
      {children}
      <div ref={setNode} className={dockClasses} />
    </DockContext>
  )
}

/** A notice inside the dock. `children` must be ONE element (the notice card). */
export function DockItem({ children }: { children: ReactNode }) {
  const node = useContext(DockContext)
  if (node === undefined) {
    // No provider: works on its own, in the same place (no stacking).
    return <div className={dockClasses}>{children}</div>
  }
  if (node === null) {
    return null // the dock is still mounting (lasts an instant)
  }
  return createPortal(children, node)
}
