import { useState } from 'react'
import type { SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { NumberStepper } from '../../ui/NumberStepper'
import { Sheet } from '../../ui/Sheet'

export type SetValues = Pick<SetEntry, 'weightKg' | 'reps'>

type SetEditorProps = {
  /** Set being edited, or `null` with the panel closed. */
  set: SetEntry | null
  title: string
  /** Step of the load −/+ buttons (depends on the equipment: Settings). */
  weightStepKg: number
  onClose: () => void
  /** `complete: true` = save and mark as completed. */
  onSave: (values: SetValues, complete: boolean) => void
  onDelete: () => void
  /** `false` hides "Excluir série" (the only set of a finished workout: delete the workout instead). */
  canDelete?: boolean
}

export function SetEditor({
  set,
  title,
  weightStepKg,
  onClose,
  onSave,
  onDelete,
  canDelete = true,
}: SetEditorProps) {
  return (
    <Sheet open={set !== null} title={title} onClose={onClose} dismissOnBackdrop={false}>
      {/* `key` makes the form "restart" when another set is opened. */}
      {set && (
        <SetEditorForm
          key={set.id}
          set={set}
          weightStepKg={weightStepKg}
          onSave={onSave}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      )}
    </Sheet>
  )
}

type SetEditorFormProps = {
  set: SetEntry
  weightStepKg: number
  onSave: SetEditorProps['onSave']
  onDelete: () => void
  canDelete: boolean
}

function SetEditorForm({
  set,
  weightStepKg,
  onSave,
  onDelete,
  canDelete,
}: SetEditorFormProps) {
  const { t } = useI18n()
  // Local copy: nothing is saved until one of the buttons is tapped.
  const [weightKg, setWeightKg] = useState(set.weightKg)
  const [reps, setReps] = useState(set.reps)
  const values: SetValues = { weightKg, reps }
  const completed = set.completedAt !== null

  return (
    <div className="flex flex-col gap-6">
      <NumberStepper
        label={t.workout.weight}
        unit={t.common.kg}
        step={weightStepKg}
        // Even with a whole-number step (dumbbells in steps of 2), you can type 12.5.
        decimal
        value={weightKg}
        onChange={setWeightKg}
      />
      <NumberStepper
        label={t.workout.reps}
        step={1}
        min={1}
        value={reps}
        onChange={setReps}
      />

      <div className="flex flex-col gap-3">
        {!completed && (
          <Button variant="primary" fullWidth onClick={() => onSave(values, true)}>
            {t.workout.completeSetButton}
          </Button>
        )}
        <Button fullWidth onClick={() => onSave(values, false)}>
          {t.common.save}
        </Button>
        {canDelete && (
          <Button variant="ghost" fullWidth onClick={onDelete}>
            {t.workout.deleteSet}
          </Button>
        )}
      </div>
    </div>
  )
}
