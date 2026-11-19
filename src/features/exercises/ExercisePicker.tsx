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
 * Painel para escolher um exercício (treino ativo e editor de rotina).
 * Se o exercício não está na biblioteca, dá para criá-lo ali mesmo: ele é salvo
 * na biblioteca e já vem escolhido.
 */
export function ExercisePicker({ open, onClose, onPick }: ExercisePickerProps) {
  const { t, language } = useI18n()
  const exercises = useLiveQuery(() => listActiveExercises(db, language), [language])
  // `null` = vendo a lista; texto = criando um exercício novo com este nome inicial.
  const [creatingName, setCreatingName] = useState<string | null>(null)

  function close() {
    setCreatingName(null) // a próxima abertura começa pela lista
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
