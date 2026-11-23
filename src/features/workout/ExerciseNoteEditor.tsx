import { useState } from 'react'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { TextField } from '../../ui/TextField'
import { MAX_EXERCISE_NOTE_LENGTH } from './workoutStats'

type ExerciseNoteEditorProps = {
  open: boolean
  /** Exercise name, for the title ("Nota · Supino reto"). */
  name: string
  /** The current note (`''` = none). */
  note: string
  onClose: () => void
  /** Receives the typed text; an empty one deletes the note. */
  onSave: (text: string) => void
}

/**
 * Writes the day's note of an exercise (active workout and history detail). A tap outside
 * does not close it: a sweaty hand must not throw away what was typed.
 */
export function ExerciseNoteEditor({
  open,
  name,
  note,
  onClose,
  onSave,
}: ExerciseNoteEditorProps) {
  const { t } = useI18n()
  return (
    <Sheet
      open={open}
      title={t.workout.note.title(name)}
      onClose={onClose}
      dismissOnBackdrop={false}
    >
      {/* Rendered only while open: the field restarts at the saved note each time. */}
      {open && <NoteForm note={note} onSave={onSave} />}
    </Sheet>
  )
}

function NoteForm({ note, onSave }: { note: string; onSave: (text: string) => void }) {
  const { t } = useI18n()
  const [text, setText] = useState(note)

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label={t.workout.note.label}
        value={text}
        onChange={setText}
        placeholder={t.workout.note.placeholder}
        maxLength={MAX_EXERCISE_NOTE_LENGTH}
        multiline
      />
      <p className="text-sm text-muted">{t.workout.note.hint}</p>
      <Button variant="primary" fullWidth onClick={() => onSave(text)}>
        {t.workout.note.save}
      </Button>
    </div>
  )
}
