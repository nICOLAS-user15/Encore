import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '../lib/cn'

export type BottomNavItem = {
  to: string
  label: string
  icon: ReactNode
  /**
   * The tab is marked active on any address that starts with this. Useful when `to`
   * changes: the Workout tab points to the open workout (/treino/abc), but stays
   * marked on the list (/treino).
   */
  activePrefix?: string
}

type BottomNavProps = {
  items: BottomNavItem[]
  /** Navigation name for screen readers (e.g. "Navegação principal"). */
  label: string
}

/**
 * Tab bar fixed at the bottom. The active tab uses light text + a thick bar on top
 * (not the accent color, which is reserved for main actions and PRs).
 */
export function BottomNav({ items, label }: BottomNavProps) {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={label}
      className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t-2 border-line bg-background"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((item) => (
          <li key={item.label}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 border-t-4 [&>svg]:size-6',
                  isActive ||
                    (item.activePrefix && pathname.startsWith(item.activePrefix))
                    ? 'border-text text-text'
                    : 'border-transparent text-muted',
                )
              }
            >
              {item.icon}
              <span className="text-xs font-semibold tracking-wider uppercase">
                {item.label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
