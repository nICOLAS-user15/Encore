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

/** Name of the section of the current URL, in the app language. */
function routeTitle(pathname: string, t: Messages): string | null {
  if (pathname.startsWith('/treino')) return t.nav.workout
  if (pathname.startsWith('/rotinas')) return t.nav.routines
  if (pathname.startsWith('/exercicios')) return t.nav.exercises
  if (pathname.startsWith('/historico')) return t.nav.history
  if (pathname.startsWith('/configuracoes')) return t.settings.title
  if (pathname.startsWith('/sobre')) return t.about.title
  return null
}

/** Shell of every screen: top bar, scrollable content, fixed tabs at the bottom. */
export function AppLayout() {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // The most specific route that matched the URL says whether the screen is an inner one (handle.backTo).
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined

  // Workout in progress: the banner shows on every screen, except the Workout tab
  // (there the list already shows the "Continuar" card, and the workout is the screen itself).
  const activeWorkout = useLiveQuery(() => getActiveWorkoutInfo(db), [])
  const showBanner = Boolean(activeWorkout) && !location.pathname.startsWith('/treino')

  // When OPENING the app with a workout in progress, go straight to it (instead of the list, with one
  // more tap to "Continuar"). Only once: afterwards, "Voltar" to the list works normally.
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

  // Title of the browser tab / of the app (screen readers and the app switcher announce it).
  const pageTitle = routeTitle(location.pathname, t)
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Encore` : 'Encore'
  }, [pageTitle])

  const navItems: BottomNavItem[] = [
    {
      // With an open workout, the tab goes straight to it (one tap, in the middle of a set).
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
         * Extra space at the end = height of the BottomNav (4rem) + iPhone safe area,
         * plus 6rem when the workout banner is in the dock (so it does not cover the end of the list).
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
           * `key` changes on every screen: React recreates the block and the entry animation
           * runs again. That way, switching tabs or opening a detail gives a slight slide.
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
