import { useState } from 'react'
import type { SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { NumberStepper } from '../../ui/NumberStepper'
import { Sheet } from '../../ui/Sheet'

export type SetValues = Pick<SetEntry, 'weightKg' | 'reps'>

type SetEditorProps = {
  /** Série sendo editada, ou `null` com o painel fechado. */
  set: SetEntry | null
  title: string
  /** Salto dos botões −/+ de carga (depende do equipamento: Configurações). */
  weightStepKg: number
  onClose: () => void
  /** `complete: true` = salvar e marcar como concluída. */
  onSave: (values: SetValues, complete: boolean) => void
  onDelete: () => void
}

export function SetEditor({
  set,
  title,
  weightStepKg,
  onClose,
  onSave,
  onDelete,
}: SetEditorProps) {
  return (
    <Sheet open={set !== null} title={title} onClose={onClose} dismissOnBackdrop={false}>
      {/* `key` faz o formulário "recomeçar" ao abrir outra série. */}
      {set && (
        <SetEditorForm
          key={set.id}
          set={set}
          weightStepKg={weightStepKg}
          onSave={onSave}
          onDelete={onDelete}
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
}

function SetEditorForm({ set, weightStepKg, onSave, onDelete }: SetEditorFormProps) {
  const { t } = useI18n()
  // Cópia local: nada é gravado até tocar em um dos botões.
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
        // Mesmo com salto inteiro (halteres de 2 em 2), dá para digitar 12,5.
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
        <Button variant="ghost" fullWidth onClick={onDelete}>
          {t.workout.deleteSet}
        </Button>
      </div>
    </div>
  )
}
