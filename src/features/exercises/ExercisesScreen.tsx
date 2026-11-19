import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { listActiveExercises } from '../../db/queries'
import { useI18n } from '../../i18n/context'
import { EmptyState } from '../../ui/EmptyState'
import { DumbbellIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { ExerciseBrowser } from './ExerciseBrowser'

export function ExercisesScreen() {
  const { t, language } = useI18n()
  // useLiveQuery re-runs the query when the table changes (or the language, via the deps list)
  // and returns `undefined` until the first read finishes.
  const exercises = useLiveQuery(() => listActiveExercises(db, language), [language])

  let content = <SkeletonList heightClass="h-14" count={6} /> // loading
  if (exercises && exercises.length === 0) {
    content = (
      <EmptyState
        icon={<DumbbellIcon />}
        title={t.exercises.emptyTitle}
        description={t.exercises.emptyDescription}
      />
    )
  } else if (exercises) {
    content = <ExerciseBrowser exercises={exercises} />
  }

  return (
    <>
      <ScreenHeader
        title={t.exercises.title}
        eyebrow={exercises ? t.exercises.count(exercises.length) : undefined}
      />
      <div className="px-4 py-6">{content}</div>
    </>
  )
}
