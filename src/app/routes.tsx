import { Navigate, type RouteObject } from 'react-router'
import { ExercisesScreen } from '../features/exercises/ExercisesScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
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
 * Lista de rotas separada da criação do router: assim os testes conseguem
 * montar as mesmas rotas com `createMemoryRouter` (sem depender da URL real).
 *
 * `handle.backTo` marca as telas internas (mostram "Voltar" no topo).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    // Erro durante a renderização de qualquer tela: mensagem no idioma do app, com "Recarregar".
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <Navigate to="/treino" replace /> },
      // Lista de treinos; o escolhido abre na rota de baixo, com "Voltar" para a lista.
      { path: 'treino', element: <StartWorkout /> },
      {
        path: 'treino/:workoutId',
        element: <ActiveWorkoutScreen />,
        handle: { backTo: '/treino' } satisfies RouteHandle,
      },
      { path: 'rotinas', element: <RoutinesScreen /> },
      // Rotina nova: só passa a existir no banco quando o usuário toca em "Salvar".
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
      { path: 'historico', element: <HistoryScreen /> },
      // `:workoutId` é um parâmetro: /historico/abc-123 -> workoutId = "abc-123".
      {
        path: 'historico/:workoutId',
        element: <WorkoutDetailScreen />,
        handle: { backTo: '/historico' } satisfies RouteHandle,
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
      // Qualquer URL desconhecida volta para a tela principal.
      { path: '*', element: <Navigate to="/treino" replace /> },
    ],
  },
]
