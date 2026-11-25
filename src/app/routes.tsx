import { Navigate, type RouteObject } from 'react-router'
import { ExercisesScreen } from '../features/exercises/ExercisesScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { WorkoutDetailScreen } from '../features/history/WorkoutDetailScreen'
import { RoutinesScreen } from '../features/routines/RoutinesScreen'
import { ActiveWorkoutScreen } from '../features/workout/ActiveWorkoutScreen'
import { StartWorkout } from '../features/workout/StartWorkout'
import { AppLayout } from './AppLayout'
import { RouteErrorScreen } from './ErrorScreen'
import type { RouteHandle } from './routeHandle'

/*
 * Secondary screens load on demand (their own JS file): opening the app between sets
 * only parses the workout, the lists and the history. Offline still works: the service
 * worker precaches every JS file of the build (globPatterns in vite.config.ts), so these
 * files are on the phone before they are ever opened.
 */
const lazyScreens = {
  bodyWeight: async () => ({
    Component: (await import('../features/bodyweight/BodyWeightScreen')).BodyWeightScreen,
  }),
  exerciseDetail: async () => ({
    Component: (await import('../features/exercises/ExerciseDetailScreen'))
      .ExerciseDetailScreen,
  }),
  review: async () => ({
    Component: (await import('../features/history/ReviewScreen')).ReviewScreen,
  }),
  volumeTrend: async () => ({
    Component: (await import('../features/history/VolumeTrendScreen')).VolumeTrendScreen,
  }),
  routineEditor: async () => ({
    Component: (await import('../features/routines/RoutineEditorScreen'))
      .RoutineEditorScreen,
  }),
  about: async () => ({
    Component: (await import('../features/settings/AboutScreen')).AboutScreen,
  }),
  settings: async () => ({
    Component: (await import('../features/settings/SettingsScreen')).SettingsScreen,
  }),
}

/**
 * Route list separate from the router creation: that way tests can
 * mount the same routes with `createMemoryRouter` (without depending on the real URL).
 *
 * `handle.backTo` marks the inner screens (they show "Voltar" at the top).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    // Error during the rendering of any screen: message in the app language, with "Recarregar".
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <Navigate to="/treino" replace /> },
      // Workout list; the chosen one opens on the route below, with "Voltar" to the list.
      { path: 'treino', element: <StartWorkout /> },
      {
        path: 'treino/:workoutId',
        element: <ActiveWorkoutScreen />,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      { path: 'rotinas', element: <RoutinesScreen /> },
      // New routine: it only exists in the database when the user taps "Salvar".
      {
        path: 'rotinas/nova',
        lazy: lazyScreens.routineEditor,
        handle: { backTo: '/rotinas' } satisfies RouteHandle,
      },
      {
        path: 'rotinas/:routineId',
        lazy: lazyScreens.routineEditor,
        handle: { backTo: '/rotinas' } satisfies RouteHandle,
      },
      { path: 'exercicios', element: <ExercisesScreen /> },
      {
        path: 'exercicios/:exerciseId',
        lazy: lazyScreens.exerciseDetail,
        handle: { backTo: '/exercicios' } satisfies RouteHandle,
      },
      { path: 'historico', element: <HistoryScreen /> },
      // A static segment ranks above `:workoutId` below.
      {
        path: 'historico/resumo',
        lazy: lazyScreens.review,
        handle: { backTo: '/historico' } satisfies RouteHandle,
      },
      {
        path: 'historico/volume',
        lazy: lazyScreens.volumeTrend,
        handle: { backTo: '/historico' } satisfies RouteHandle,
      },
      // `:workoutId` is a parameter: /historico/abc-123 -> workoutId = "abc-123".
      {
        path: 'historico/:workoutId',
        element: <WorkoutDetailScreen />,
        handle: { backTo: '/historico' } satisfies RouteHandle,
      },
      // Body weight: opened from the side menu, like Settings.
      {
        path: 'peso',
        lazy: lazyScreens.bodyWeight,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      {
        path: 'configuracoes',
        lazy: lazyScreens.settings,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      {
        path: 'sobre',
        lazy: lazyScreens.about,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      // Any unknown URL goes back to the main screen.
      { path: '*', element: <Navigate to="/treino" replace /> },
    ],
  },
]
