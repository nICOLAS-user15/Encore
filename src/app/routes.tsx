import { Navigate, type RouteObject } from 'react-router'
import { BodyWeightScreen } from '../features/bodyweight/BodyWeightScreen'
import { ExerciseDetailScreen } from '../features/exercises/ExerciseDetailScreen'
import { ExercisesScreen } from '../features/exercises/ExercisesScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { VolumeTrendScreen } from '../features/history/VolumeTrendScreen'
import { WorkoutDetailScreen } from '../features/history/WorkoutDetailScreen'
import { RoutineEditorScreen } from '../features/routines/RoutineEditorScreen'
import { RoutinesScreen } from '../features/routines/RoutinesScreen'
import { AboutScreen } from '../features/settings/AboutScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ActiveWorkoutScreen } from '../features/workout/ActiveWorkoutScreen'
import { StartWorkout } from '../features/workout/StartWorkout'
import { AppLayout } from './AppLayout'
import { RouteErrorScreen } from './ErrorScreen'
import type { RouteHandle } from './routeHandle'

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
        element: <RoutineEditorScreen />,
        handle: { backTo: '/rotinas' } satisfies RouteHandle,
      },
      {
        path: 'rotinas/:routineId',
        element: <RoutineEditorScreen />,
        handle: { backTo: '/rotinas' } satisfies RouteHandle,
      },
      { path: 'exercicios', element: <ExercisesScreen /> },
      {
        path: 'exercicios/:exerciseId',
        element: <ExerciseDetailScreen />,
        handle: { backTo: '/exercicios' } satisfies RouteHandle,
      },
      { path: 'historico', element: <HistoryScreen /> },
      // A static segment ranks above `:workoutId` below.
      {
        path: 'historico/volume',
        element: <VolumeTrendScreen />,
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
        element: <BodyWeightScreen />,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      {
        path: 'configuracoes',
        element: <SettingsScreen />,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      {
        path: 'sobre',
        element: <AboutScreen />,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      // Any unknown URL goes back to the main screen.
      { path: '*', element: <Navigate to="/treino" replace /> },
    ],
  },
]
