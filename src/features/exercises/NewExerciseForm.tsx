import { useState } from 'react'
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Equipment,
  type MuscleGroup,
} from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import type { NewExerciseInput } from './exerciseActions'

type NewExerciseFormProps = {
  /** O que o usuário já tinha digitado na busca. */
  initialName: string
  onCreate: (input: NewExerciseInput) => void
  onCancel: () => void
}

/**
 * Formulário de um exercício que não está na biblioteca: nome, grupo muscular e
 * equipamento. Os dois últimos são obrigatórios e não têm valor padrão de
 * propósito: o equipamento muda o salto de carga e o filtro "livres x máquinas",
 * e um padrão errado passaria despercebido.
 */
export function NewExerciseForm({
  initialName,
  onCreate,
  onCancel,
}: NewExerciseFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initialName)
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const ready = name.trim() !== '' && group !== null && equipment !== null

  return (
    <div className="flex flex-col gap-6">
      <TextField label={t.exercises.nameLabel} value={name} onChange={setName} />

      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
          {t.exercises.muscleLabel}
        </legend>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((item) => (
            <Choice key={item} active={group === item} onClick={() => setGroup(item)}>
              {t.muscleGroups[item]}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
          {t.exercises.equipmentLabel}
        </legend>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => (
            <Choice
              key={item}
              active={equipment === item}
              onClick={() => setEquipment(item)}
            >
              {t.equipment[item]}
            </Choice>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-muted">{t.exercises.customHint}</p>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          fullWidth
          disabled={!ready}
          onClick={() => {
            if (group !== null && equipment !== null) {
              onCreate({ name, muscleGroup: group, equipment })
            }
          }}
        >
          {t.exercises.createAndAdd}
        </Button>
        <Button fullWidth onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  )
}

type ChoiceProps = {
  active: boolean
  onClick: () => void
  children: string
}

function Choice({ active, onClick, children }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-12 rounded-sm border-2 px-4 text-sm font-semibold tracking-wide uppercase',
        active ? 'border-text bg-text text-background' : 'border-line-strong text-muted',
      )}
    >
      {children}
    </button>
  )
}
