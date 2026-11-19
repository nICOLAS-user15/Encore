import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { ActiveWorkout } from './ActiveWorkout'

/**
 * Rota /treino/:workoutId: o treino em andamento, com "Voltar" para a lista.
 *
 * Esta tela também decide para onde ir quando o treino deixa de estar ativo,
 * porque o banco avisa sozinho (useLiveQuery):
 * - finalizado → o detalhe dele no histórico;
 * - descartado (ou id que não existe) → a lista de treinos.
 * `replace`: o "voltar" do celular não traz de volta um treino que já acabou.
 */
export function ActiveWorkoutScreen() {
  const { workoutId = '' } = useParams()
  const { t } = useI18n()
  // `?? null` separa "não existe" (null) de "carregando" (undefined).
  const workout = useLiveQuery(
    async () => (await db.workouts.get(workoutId)) ?? null,
    [workoutId],
  )

  if (workout === undefined) {
    return <ScreenHeader title={t.workout.title} />
  }
  if (workout === null || workout.deletedAt !== null) {
    return <Navigate to="/treino" replace />
  }
  if (workout.endedAt !== null) {
    return <Navigate to={`/historico/${workout.id}`} replace />
  }
  // `key`: abrir outro treino recomeça o componente do zero.
  return <ActiveWorkout key={workout.id} workout={workout} />
}
