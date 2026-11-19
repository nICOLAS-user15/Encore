import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import type { ID, RoutineExercise, SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { MoreIcon } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'
import { useAction } from '../../ui/toastContext'
import { isSuggestionApplied, pendingPlannedSets, suggestNextLoad } from './progression'
import { SetRow } from './SetRow'
import { addSet, applyLoadSuggestion } from './workoutActions'
import { getLastPerformance } from './workoutQueries'
import { numberSets } from './workoutStats'

type ExerciseBlockProps = {
  workoutId: ID
  exerciseId: ID
  name: string
  sets: SetEntry[]
  /** Meta da rotina para este exercício (ausente em treino livre). */
  target?: RoutineExercise
  /** Id da próxima série do treino inteiro (pode ser de outro exercício). */
  nextSetId: ID | null
  /** Salto de carga do equipamento para a sugestão; `null` = peso corporal (só reps). */
  progressionStepKg: number | null
  onEditSet: (set: SetEntry) => void
  onToggleSet: (set: SetEntry) => void
  onRemove: () => void
}

/** Um exercício no treino ativo: meta, "última vez", sugestão de carga e as séries. */
export function ExerciseBlock({
  workoutId,
  exerciseId,
  name,
  sets,
  target,
  nextSetId,
  progressionStepKg,
  onEditSet,
  onToggleSet,
  onRemove,
}: ExerciseBlockProps) {
  const { t, format, note } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const run = useAction()
  // `undefined` = carregando; `null` = nunca feito antes.
  const last = useLiveQuery(
    () => getLastPerformance(db, exerciseId, workoutId),
    [exerciseId, workoutId],
  )

  // Números das séries de trabalho (1, 2, 3); aquecimento fica null e vira "AQ".
  const numbers = numberSets(sets)

  let previous: string | null = null
  if (last) {
    previous = t.workout.lastTime(format.setsSummary(last.sets))
  } else if (last === null && target && target.referenceWeightKg !== null) {
    previous = t.workout.reference(
      format.reference(target.referenceWeightKg, target.referenceReps),
    )
  }

  // Sugestão de progressão: precisa de histórico (última vez) e da faixa da rotina.
  const suggestion =
    last && target
      ? suggestNextLoad(
          last.sets,
          { min: target.targetRepsMin, max: target.targetRepsMax },
          progressionStepKg,
        )
      : null
  const pending = pendingPlannedSets(sets)

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl leading-tight font-bold uppercase">
            {name}
          </h2>
          <div className="-mt-2 -mr-2 flex shrink-0 items-center">
            {target && (
              <span className="font-display text-lg font-semibold text-muted tabular-nums">
                {format.target(
                  target.targetSets,
                  target.targetRepsMin,
                  target.targetRepsMax,
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.workout.moreOptions(name)}
              className="flex size-12 items-center justify-center text-muted active:text-text [&>svg]:size-6"
            >
              <MoreIcon />
            </button>
          </div>
        </div>
        {previous && <p className="text-sm text-muted tabular-nums">{previous}</p>}
        {target?.notes && <p className="text-sm text-muted">{note(target.notes)}</p>}
      </div>

      {suggestion && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-l-4 border-text pl-3">
          <p className="min-w-0">
            <span className="block text-xs font-semibold tracking-widest text-muted uppercase">
              {t.workout.suggestion.label} ·{' '}
              {suggestion.kind === 'increase'
                ? t.workout.suggestion.increase
                : t.workout.suggestion.moreReps}
            </span>
            <span className="font-display text-xl font-bold tabular-nums">
              {format.set(suggestion.weightKg, suggestion.reps)}
            </span>
          </p>
          {/* Sem séries pendentes, não há o que aplicar: não mostra nada à direita. */}
          {pending.length > 0 &&
            (isSuggestionApplied(sets, suggestion) ? (
              <span className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">
                {t.workout.suggestion.applied}
              </span>
            ) : (
              <Button
                aria-label={t.workout.suggestion.applyTo(name)}
                onClick={() =>
                  void run(() =>
                    applyLoadSuggestion(db, workoutId, exerciseId, {
                      weightKg: suggestion.weightKg,
                      reps: suggestion.reps,
                    }),
                  )
                }
              >
                {t.workout.suggestion.apply}
              </Button>
            ))}
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            label={numbers[index] ?? t.workout.warmupShort}
            exerciseName={name}
            isNext={set.id === nextSetId}
            onEdit={() => onEditSet(set)}
            onToggle={() => onToggleSet(set)}
          />
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => void run(() => addSet(db, workoutId, exerciseId, 'normal'))}
        >
          {t.workout.addSet}
        </Button>
        <Button
          onClick={() => void run(() => addSet(db, workoutId, exerciseId, 'encore'))}
        >
          {t.workout.addEncore}
        </Button>
      </div>

      {/* Ações menos usadas ficam no menu ⋯: o cartão fica limpo e o "Remover"
          (que apaga) não mora mais ao lado dos botões do dia a dia. */}
      <Sheet open={menuOpen} title={name} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              void run(() => addSet(db, workoutId, exerciseId, 'warmup'))
            }}
          >
            {t.workout.addWarmup}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              onRemove() // abre a confirmação
            }}
          >
            {t.workout.removeExercise}
          </Button>
        </div>
      </Sheet>
    </Card>
  )
}
