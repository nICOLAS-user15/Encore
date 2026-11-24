import { useState } from 'react'
import type { SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { NumberStepper } from '../../ui/NumberStepper'
import { Sheet } from '../../ui/Sheet'
import { platesPerSide, type PlateSetup } from './plates'
import { RirPicker } from './RirPicker'
import { isWorkingSet } from './workoutStats'

export type SetValues = Pick<SetEntry, 'weightKg' | 'reps'> & { rir: number | null }

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
  /** Shows the plates per side under the load (barbell exercises); absent = hidden. */
  plates?: PlateSetup | null
}

export function SetEditor({
  set,
  title,
  weightStepKg,
  onClose,
  onSave,
  onDelete,
  canDelete = true,
  plates = null,
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
          plates={plates}
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
  plates: PlateSetup | null
}

function SetEditorForm({
  set,
  weightStepKg,
  onSave,
  onDelete,
  canDelete,
  plates,
}: SetEditorFormProps) {
  const { t } = useI18n()
  // Local copy: nothing is saved until one of the buttons is tapped.
  const [weightKg, setWeightKg] = useState(set.weightKg)
  const [reps, setReps] = useState(set.reps)
  const [rir, setRir] = useState(set.rir ?? null)
  const values: SetValues = { weightKg, reps, rir }
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
      {plates && <PlatesLine weightKg={weightKg} plates={plates} />}
      <NumberStepper
        label={t.workout.reps}
        step={1}
        min={1}
        value={reps}
        onChange={setReps}
      />
      {/* Warm-up is not a working effort: no reps in reserve. */}
      {isWorkingSet(set) && <RirPicker value={rir} onChange={setRir} />}

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

/** "Por lado: 20 + 10 + 2,5": follows the load while −/+ is tapped, no extra tap needed. */
function PlatesLine({ weightKg, plates }: { weightKg: number; plates: PlateSetup }) {
  const { t, format } = useI18n()
  const load = platesPerSide(weightKg, plates.barKg, plates.platesKg)

  let text: string
  if (load === null) {
    text = t.workout.plates.belowBar(format.decimal(plates.barKg))
  } else if (load.plates.length === 0 && load.missingKg === 0) {
    text = t.workout.plates.barOnly
  } else {
    text = t.workout.plates.perSide(load.plates.map(format.decimal).join(' + ') || '—')
    if (load.missingKg > 0) {
      text += ` · ${t.workout.plates.missing(format.decimal(load.missingKg))}`
    }
  }
  return <p className="-mt-3 text-sm text-muted tabular-nums">{text}</p>
}
