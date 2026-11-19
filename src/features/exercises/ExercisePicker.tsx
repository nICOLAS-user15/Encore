import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import { listActiveExercises } from '../../db/queries'
import type { Exercise } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Sheet } from '../../ui/Sheet'
import { createCustomExercise, type NewExerciseInput } from './exerciseActions'
import { ExerciseBrowser } from './ExerciseBrowser'
import { NewExerciseForm } from './NewExerciseForm'

type ExercisePickerProps = {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
}

/**
 * Sheet to pick an exercise (active workout and routine editor).
 * If the exercise is not in the library, it can be created right there: it is saved
 * to the library and comes already selected.
 */
export function ExercisePicker({ open, onClose, onPick }: ExercisePickerProps) {
  const { t, language } = useI18n()
  const exercises = useLiveQuery(() => listActiveExercises(db, language), [language])
  // `null` = viewing the list; text = creating a new exercise with this initial name.
  const [creatingName, setCreatingName] = useState<string | null>(null)

  function close() {
    setCreatingName(null) // the next opening starts on the list
    onClose()
  }

  async function handleCreate(input: NewExerciseInput) {
    const exercise = await createCustomExercise(db, input)
    setCreatingName(null)
    onPick(exercise)
  }

  return (
    <Sheet
      open={open}
      title={creatingName === null ? t.exercises.pickTitle : t.exercises.newTitle}
      onClose={close}
    >
      {exercises &&
        (creatingName === null ? (
          <ExerciseBrowser
            exercises={exercises}
            onSelect={onPick}
            onCreate={setCreatingName}
          />
        ) : (
          <NewExerciseForm
            initialName={creatingName}
            onCreate={(input) => void handleCreate(input)}
            onCancel={() => setCreatingName(null)}
          />
        ))}
    </Sheet>
  )
}
