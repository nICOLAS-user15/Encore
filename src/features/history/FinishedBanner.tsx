import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { useToast } from '../../ui/toastContext'
import { daysSince, offersPostWorkoutBackup } from '../settings/backupReminder'
import { exportMessage } from '../settings/exportMessage'
import { useBackupExport } from '../settings/useBackupExport'
import { useSettings } from '../settings/useSettings'
import { volumeChangePercent } from './compareWorkouts'
import { getPreviousSummary, type WorkoutSummary } from './historyQueries'

/**
 * Post-workout summary: the top of the workout detail right after "Finalizar treino".
 * One headline (volume against last time, or "first time") and "Pronto", the screen's
 * only red button, back to the Workout tab. The numbers, records and comparison stay
 * in the cards below it; this is the moment of "done", not another table. When the last
 * backup is a week old (or never happened), it also offers one: the phone is in hand.
 */
export function FinishedBanner({ summary }: { summary: WorkoutSummary }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const previous = useLiveQuery(
    () => getPreviousSummary(db, summary.workout),
    [summary.workout.id, summary.workout.startedAt, summary.workout.routineId],
  )

  let headline: string | null = null
  if (previous) {
    const percent = volumeChangePercent(summary, previous)
    headline = percent === null ? null : t.history.finished.volumeChange(percent)
  } else if (previous === null && summary.workout.routineId !== null) {
    headline = t.history.finished.firstTime
  }

  return (
    <section
      aria-labelledby="finished-title"
      className="flex flex-col gap-3 rounded-sm border-2 border-line-strong bg-surface p-4 shadow-card"
    >
      <h2
        id="finished-title"
        className="font-display text-4xl leading-none font-bold uppercase"
      >
        {t.history.finished.title}
      </h2>
      {headline && <p className="text-lg">{headline}</p>}
      <BackupOffer />
      <Button variant="primary" fullWidth onClick={() => void navigate('/treino')}>
        {t.common.done}
      </Button>
    </section>
  )
}

/** "Último backup: há 9 dias" + "Fazer backup" (secondary: "Pronto" keeps the red). */
function BackupOffer() {
  const { t } = useI18n()
  const { showInfo } = useToast()
  const { settings, loaded } = useSettings()
  const now = useNow(60_000)
  const { busy, exportFile } = useBackupExport()

  // `loaded`: the default ("never") would flash the offer before the settings arrive.
  if (!loaded || !offersPostWorkoutBackup(settings.lastBackupAt, now)) {
    return null
  }

  async function handleBackup() {
    const message = exportMessage(await exportFile(), t)
    if (message) {
      showInfo(message)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-line pt-3">
      <p className="text-sm text-muted">
        {t.settings.lastBackup(
          settings.lastBackupAt === null ? null : daysSince(settings.lastBackupAt, now),
        )}
      </p>
      <Button fullWidth disabled={busy} onClick={() => void handleBackup()}>
        {t.history.finished.backup}
      </Button>
    </div>
  )
}
