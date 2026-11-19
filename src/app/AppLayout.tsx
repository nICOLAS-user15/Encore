import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { db } from '../db/db'
import { ActiveWorkoutBanner } from '../features/workout/ActiveWorkoutBanner'
import { RestTimerProvider } from '../features/workout/RestTimerProvider'
import { getActiveWorkoutInfo } from '../features/workout/workoutQueries'
import { useI18n } from '../i18n/context'
import type { Messages } from '../i18n/pt'
import { cn } from '../lib/cn'
import { BottomNav, type BottomNavItem } from '../ui/BottomNav'
import { BarbellIcon, CalendarIcon, DumbbellIcon, ListIcon } from '../ui/icons'
import type { RouteHandle } from './routeHandle'
import { SideMenu } from './SideMenu'
import { TopBar } from './TopBar'

/** Nome da seção da URL atual, no idioma do app. */
function routeTitle(pathname: string, t: Messages): string | null {
  if (pathname.startsWith('/treino')) return t.nav.workout
  if (pathname.startsWith('/rotinas')) return t.nav.routines
  if (pathname.startsWith('/exercicios')) return t.nav.exercises
  if (pathname.startsWith('/historico')) return t.nav.history
  if (pathname.startsWith('/configuracoes')) return t.settings.title
  if (pathname.startsWith('/sobre')) return t.about.title
  return null
}

/** Casca de todas as telas: barra do topo, conteúdo rolável, abas fixas embaixo. */
export function AppLayout() {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // A rota mais específica que bateu com a URL diz se a tela é interna (handle.backTo).
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined

  // Treino em andamento: a faixa aparece em todas as telas, menos na aba Treino
  // (lá a lista já mostra o cartão "Continuar", e o treino é a própria tela).
  const activeWorkout = useLiveQuery(() => getActiveWorkoutInfo(db), [])
  const showBanner = Boolean(activeWorkout) && !location.pathname.startsWith('/treino')

  // Ao ABRIR o app com um treino em andamento, vai direto a ele (em vez da lista, com mais
  // um toque para "Continuar"). Só uma vez: depois, "Voltar" para a lista funciona normal.
  const navigate = useNavigate()
  const startRedirectDone = useRef(false)
  useEffect(() => {
    if (activeWorkout === undefined || startRedirectDone.current) {
      return
    }
    startRedirectDone.current = true
    if (activeWorkout && location.pathname === '/treino') {
      navigate(`/treino/${activeWorkout.workout.id}`, { replace: true })
    }
  }, [activeWorkout, location.pathname, navigate])

  // Título da aba do navegador / do app (leitores de tela e o seletor de apps anunciam).
  const pageTitle = routeTitle(location.pathname, t)
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Encore` : 'Encore'
  }, [pageTitle])

  const navItems: BottomNavItem[] = [
    {
      // Com um treino aberto, a aba leva direto a ele (um toque, no meio da série).
      to: activeWorkout ? `/treino/${activeWorkout.workout.id}` : '/treino',
      activePrefix: '/treino',
      label: t.nav.workout,
      icon: <BarbellIcon />,
    },
    { to: '/rotinas', label: t.nav.routines, icon: <ListIcon /> },
    { to: '/exercicios', label: t.nav.exercises, icon: <DumbbellIcon /> },
    { to: '/historico', label: t.nav.history, icon: <CalendarIcon /> },
  ]

  return (
    <RestTimerProvider>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <TopBar backTo={handle?.backTo} onOpenMenu={() => setMenuOpen(true)} />
        {/*
         * Espaço extra no fim = altura da BottomNav (4rem) + safe area do iPhone,
         * e mais 6rem quando a faixa do treino está na doca (para não cobrir o fim da lista).
         */}
        <main
          className={cn(
            'flex-1',
            showBanner
              ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(4rem+env(safe-area-inset-bottom))]',
          )}
        >
          {/*
           * `key` muda a cada tela: o React recria o bloco e a animação de entrada
           * roda de novo. Assim, trocar de aba ou abrir um detalhe dá um leve deslize.
           */}
          <div key={location.pathname} className="animate-screen-in">
            <Outlet />
          </div>
        </main>
        <BottomNav items={navItems} label={t.app.mainNav} />
        <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        {showBanner && activeWorkout && <ActiveWorkoutBanner info={activeWorkout} />}
      </div>
    </RestTimerProvider>
  )
}
