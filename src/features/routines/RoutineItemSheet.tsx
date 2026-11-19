import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'
import { Button } from '../../ui/Button'
import { NumberStepper } from '../../ui/NumberStepper'
import { Sheet } from '../../ui/Sheet'
import { TextField } from '../../ui/TextField'
import { REST_OPTIONS } from '../settings/settingsRepository'
import { useSettings } from '../settings/useSettings'
import type { DraftItem } from './routineDraft'

type RoutineItemSheetProps = {
  /** Draft exercise being edited, or `null` with the sheet closed. */
  item: DraftItem | null
  exerciseName: string
  /** Changes exercise fields IN THE DRAFT (nothing goes to the database before "Salvar"). */
  onChange: (changes: Partial<DraftItem>) => void
  /** Removes the exercise from the draft. */
  onRemove: () => void
  onClose: () => void
}

/**
 * Sheet to edit a routine exercise's target: sets, reps, reference load,
 * rest and note. Changes stay in the routine draft and are only written when the
 * user taps "Salvar" on the routine screen.
 */
export function RoutineItemSheet({
  item,
  exerciseName,
  onChange,
  onRemove,
  onClose,
}: RoutineItemSheetProps) {
  return (
    <Sheet open={item !== null} title={exerciseName} onClose={onClose}>
      {item && (
        <RoutineItemForm
          item={item}
          onChange={onChange}
          onRemove={onRemove}
          onClose={onClose}
        />
      )}
    </Sheet>
  )
}

type RoutineItemFormProps = Omit<RoutineItemSheetProps, 'item' | 'exerciseName'> & {
  item: DraftItem
}

function RoutineItemForm({ item, onChange, onRemove, onClose }: RoutineItemFormProps) {
  const { t } = useI18n()
  const { settings } = useSettings()

  return (
    <div className="flex flex-col gap-6">
      <NumberStepper
        label={t.routines.sets}
        min={1}
        max={20}
        value={item.targetSets}
        onChange={(targetSets) => onChange({ targetSets })}
      />
      <div className="grid grid-cols-1 gap-6">
        <NumberStepper
          label={t.routines.repsMin}
          min={1}
          max={100}
          value={item.targetRepsMin}
          onChange={(targetRepsMin) => onChange({ targetRepsMin })}
        />
        <NumberStepper
          label={t.routines.repsMax}
          min={1}
          max={100}
          value={item.targetRepsMax}
          onChange={(targetRepsMax) => onChange({ targetRepsMax })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <NumberStepper
          label={t.routines.referenceWeight}
          unit={t.common.kg}
          step={2.5}
          value={item.referenceWeightKg ?? 0}
          // 0 on screen = "no reference" in the database.
          onChange={(kg) => onChange({ referenceWeightKg: kg > 0 ? kg : null })}
        />
        <p className="text-sm text-muted">{t.routines.referenceHint}</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
          {t.routines.rest}
        </legend>
        <div className="flex flex-wrap gap-2">
          {/* `null` = follows the Settings default (shown in parentheses). */}
          {[null, ...REST_OPTIONS].map((seconds) => (
            <button
              key={seconds ?? 'default'}
              type="button"
              aria-pressed={item.restSeconds === seconds}
              onClick={() => onChange({ restSeconds: seconds })}
              className={cn(
                'min-h-12 min-w-14 rounded-sm border-2 px-3 font-display text-lg font-semibold tabular-nums',
                item.restSeconds === seconds
                  ? 'border-text bg-text text-background'
                  : 'border-line-strong text-muted',
              )}
            >
              {seconds === null
                ? t.routines.restDefault(formatClock(settings.restSeconds * 1000))
                : formatClock(seconds * 1000)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{t.routines.restHint}</p>
      </fieldset>

      <TextField
        label={t.routines.itemNotes}
        placeholder={t.routines.itemNotesPlaceholder}
        value={item.notes}
        onChange={(notes) => onChange({ notes })}
      />

      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={onClose}>
          {t.common.done}
        </Button>
        <Button variant="ghost" fullWidth onClick={onRemove}>
          {t.routines.removeFromRoutine}
        </Button>
      </div>
    </div>
  )
}
