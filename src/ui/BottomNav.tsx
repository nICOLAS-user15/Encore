import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '../lib/cn'

export type BottomNavItem = {
  to: string
  label: string
  icon: ReactNode
  /**
   * A aba fica marcada em qualquer endereço que comece com isto. Útil quando `to`
   * muda: a aba Treino aponta para o treino aberto (/treino/abc), mas continua
   * marcada na lista (/treino).
   */
  activePrefix?: string
}

type BottomNavProps = {
  items: BottomNavItem[]
  /** Nome da navegação para leitores de tela (ex.: "Navegação principal"). */
  label: string
}

/**
 * Barra de abas fixa no rodapé. A aba ativa usa texto claro + barra grossa no topo
 * (e não a cor de acento, que fica reservada para ações principais e PRs).
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
