import { useRef, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useI18n } from '../i18n/context'
import { cn } from '../lib/cn'
import { GlitchWordmark } from '../ui/Logo'
import {
  BarbellIcon,
  CalendarIcon,
  CloseIcon,
  InfoIcon,
  DumbbellIcon,
  ListIcon,
  ScaleIcon,
  SettingsIcon,
} from '../ui/icons'
import { useModalDialog } from '../ui/useModalDialog'
import { useSwipeToDismiss } from '../ui/useSwipeToDismiss'

type SideMenuProps = {
  open: boolean
  onClose: () => void
}

type MenuItem = { to: string; label: string; icon: ReactNode }

/**
 * Menu that opens from the left: it slides in and the logo does a quick
 * "glitch". It closes (without animation, to be immediate) by tapping outside, on the X, with Esc
 * or when choosing a destination. It is a native `<dialog>`, like the Sheet (see useModalDialog).
 */
export function SideMenu({ open, onClose }: SideMenuProps) {
  const { t } = useI18n()
  const ref = useModalDialog(open)
  // Drag the menu to the left to close it.
  const panelRef = useRef<HTMLElement>(null)
  useSwipeToDismiss({
    panel: panelRef,
    handle: panelRef,
    direction: 'left',
    open,
    onDismiss: onClose,
  })

  const mainItems: MenuItem[] = [
    { to: '/treino', label: t.nav.workout, icon: <BarbellIcon /> },
    { to: '/rotinas', label: t.nav.routines, icon: <ListIcon /> },
    { to: '/exercicios', label: t.nav.exercises, icon: <DumbbellIcon /> },
    { to: '/historico', label: t.nav.history, icon: <CalendarIcon /> },
    { to: '/peso', label: t.bodyWeight.title, icon: <ScaleIcon /> },
  ]
  const appItems: MenuItem[] = [
    { to: '/configuracoes', label: t.settings.title, icon: <SettingsIcon /> },
    { to: '/sobre', label: t.about.menuItem, icon: <InfoIcon /> },
  ]

  return (
    <dialog
      ref={ref}
      aria-label={t.app.menu}
      onClose={onClose}
      // Tap outside the menu (transparent area of the <dialog>) closes it.
      // `cursor-pointer` matters on iOS Safari: it only dispatches `click` on elements that
      // look clickable, and React listens at the root, so without it the tap outside is ignored.
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="m-0 size-full max-h-none max-w-none cursor-pointer border-0 bg-transparent p-0 text-text backdrop:animate-fade-in backdrop:bg-background/85 open:flex"
    >
      {/* Since the content only exists when open, the animations run on every opening. */}
      {open && (
        <nav
          ref={panelRef}
          aria-label={t.app.menu}
          className="pt-safe pb-safe flex h-full w-[min(20rem,85vw)] cursor-auto animate-menu-in flex-col border-r-4 border-text bg-surface-high shadow-raised"
        >
          <div className="flex items-center justify-between border-b-2 border-line py-2 pr-1 pl-4">
            <GlitchWordmark className="h-6" />
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="flex size-12 items-center justify-center active:text-muted [&>svg]:size-6"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <MenuList items={mainItems} onNavigate={onClose} />
            <div className="mx-4 my-2 border-t-2 border-line" />
            <MenuList items={appItems} onNavigate={onClose} />
          </div>

          <p className="border-t-2 border-line px-4 py-3 text-xs text-muted">
            {t.about.version(__APP_VERSION__)}
          </p>
        </nav>
      )}
    </dialog>
  )
}

function MenuList({ items, onNavigate }: { items: MenuItem[]; onNavigate: () => void }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 items-center gap-4 border-l-4 px-4 font-display text-xl font-semibold uppercase [&>svg]:size-6',
                isActive ? 'border-text text-text' : 'border-transparent text-muted',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
