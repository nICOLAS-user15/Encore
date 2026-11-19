import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import {
  Navigate,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { db } from '../../db/db'
import type { Exercise, ID, Split } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { DockItem } from '../../ui/BottomDock'
import { Button } from '../../ui/Button'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { ArrowDownIcon, ArrowUpIcon, ListIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { Section } from '../../ui/Section'
import { TextField } from '../../ui/TextField'
import { ExercisePicker } from '../exercises/ExercisePicker'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { SplitTabs } from '../splits/SplitTabs'
import { useSplits } from '../splits/useSplits'
import { deleteRoutine, saveRoutine } from './routineActions'
import {
  blankDraft,
  draftFromRoutine,
  isDraftDirty,
  moveDraftItem,
  newDraftItem,
  updateDraftItem,
  type RoutineDraft,
} from './routineDraft'
import { RoutineItemSheet } from './RoutineItemSheet'
import {
  getRoutineWithExercises,
  listRoutinesWithExercises,
  type RoutineWithExercises,
} from './routineQueries'

const arrowButtonClasses =
  'flex size-12 shrink-0 items-center justify-center rounded-sm border-2 border-line-strong text-text active:border-text disabled:opacity-30 [&>svg]:size-5'

/**
 * Editor de rotina. Duas rotas usam esta tela:
 * - /rotinas/:routineId: edita uma rotina que existe;
 * - /rotinas/nova?divisao=<id>: cria uma rotina nova dentro de uma divisão.
 *
 * Tudo o que o usuário muda fica num RASCUNHO e só vai para o banco quando ele
 * toca em "Salvar". Rotina nova só passa a existir nesse momento.
 */
export function RoutineEditorScreen() {
  const { t } = useI18n()
  const { routineId } = useParams()
  const [searchParams] = useSearchParams()
  const { splits, active: activeSplit } = useSplits()
  const allRoutines = useLiveQuery(() => listRoutinesWithExercises(db), [])
  const exerciseMap = useExerciseMap()
  // `undefined` = carregando; `null` = rotina não encontrada; `'new'` = rotina nova.
  const loaded = useLiveQuery(
    async (): Promise<RoutineWithExercises | 'new' | null> =>
      routineId === undefined ? 'new' : await getRoutineWithExercises(db, routineId),
    [routineId],
  )

  if (loaded === undefined || !allRoutines || !splits || !exerciseMap) {
    // Carregando: o cabeçalho já aparece, para a tela não "pular" quando o conteúdo chegar.
    return <ScreenHeader title={t.routines.editorTitle} />
  }

  if (loaded === null) {
    return (
      <>
        <ScreenHeader title={t.routines.editorTitle} />
        <div className="px-4 py-6">
          <EmptyState
            icon={<ListIcon />}
            title={t.routines.notFound}
            description={t.history.notFoundDescription}
          />
        </div>
      </>
    )
  }

  // Ponto de partida do rascunho.
  let initial: RoutineDraft
  if (loaded === 'new') {
    // A divisão vem da URL (a que estava escolhida na lista); se não vale, a escolhida nas abas.
    const fromUrl = splits.find((split) => split.id === searchParams.get('divisao'))
    const split = fromUrl ?? activeSplit
    if (!split) {
      return <Navigate to="/rotinas" replace /> // sem divisão não há onde criar a rotina
    }
    const count = allRoutines.filter((entry) => entry.routine.splitId === split.id).length
    initial = blankDraft(split.id, count)
  } else {
    const siblings = allRoutines.filter(
      (entry) => entry.routine.splitId === loaded.routine.splitId,
    )
    const position = Math.max(
      0,
      siblings.findIndex((entry) => entry.routine.id === loaded.routine.id),
    )
    initial = draftFromRoutine(loaded.routine, loaded.items, position)
  }

  return (
    // `key`: abrir outra rotina (ou uma nova) recomeça o rascunho do zero.
    <RoutineEditorForm
      key={routineId ?? 'nova'}
      routineId={routineId ?? null}
      initial={initial}
      splits={splits}
      allRoutines={allRoutines}
      exerciseMap={exerciseMap}
    />
  )
}

type RoutineEditorFormProps = {
  /** `null` = rotina nova (ainda não existe no banco). */
  routineId: ID | null
  initial: RoutineDraft
  splits: Split[]
  allRoutines: RoutineWithExercises[]
  exerciseMap: Map<ID, Exercise>
}

function RoutineEditorForm({
  routineId,
  initial,
  splits,
  allRoutines,
  exerciseMap,
}: RoutineEditorFormProps) {
  const { t, format, exerciseName } = useI18n()
  const navigate = useNavigate()
  const { select: selectSplit } = useSplits()
  const isNew = routineId === null

  // `baseline` = como estava ao abrir (para saber se há algo a salvar); `draft` = o que está na tela.
  const [baseline] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const dirty = isDraftDirty(draft, baseline)
  const nameFilled = draft.name.trim() !== ''
  const canSave = nameFilled && (dirty || isNew) && !saving

  // Sair da tela com alterações não salvas pede confirmação (Voltar, abas, menu).
  // Guardamos o valor em refs porque o bloqueio é consultado só na hora de navegar.
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  // Ligada pelo Salvar e pelo Excluir, que saem da tela de propósito.
  const allowLeave = useRef(false)
  const blocker = useBlocker(() => dirtyRef.current && !allowLeave.current)

  const editingItem = draft.items.find((item) => item.key === editingKey) ?? null
  const nameOf = (exerciseId: ID) => exerciseName(exerciseMap.get(exerciseId))

  // As OUTRAS rotinas da divisão escolhida no rascunho: a posição é entre elas.
  const othersInSplit = allRoutines.filter(
    (entry) => entry.routine.splitId === draft.splitId && entry.routine.id !== routineId,
  ).length
  const splitName = splits.find((split) => split.id === draft.splitId)?.name

  function change(changes: Partial<RoutineDraft>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function chooseSplit(splitId: ID) {
    if (splitId === draft.splitId) {
      return
    }
    // Voltou para a divisão original: volta também para a posição original.
    const position =
      splitId === baseline.splitId
        ? baseline.position
        : allRoutines.filter(
            (entry) =>
              entry.routine.splitId === splitId && entry.routine.id !== routineId,
          ).length
    change({ splitId, position })
  }

  function handlePick(exercise: Exercise) {
    setDraft((current) => ({
      ...current,
      items: [...current.items, newDraftItem(exercise.id)],
    }))
    setPickerOpen(false)
  }

  async function handleSave() {
    setSaving(true)
    setFailed(false)
    try {
      await saveRoutine(db, routineId, draft)
      // A lista de Rotinas abre na divisão desta rotina (espera gravar antes de trocar de tela).
      await selectSplit(draft.splitId)
      allowLeave.current = true
      // replace: "Voltar" não deve trazer de volta o editor.
      navigate('/rotinas', { replace: true })
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (routineId === null) {
      return
    }
    await deleteRoutine(db, routineId)
    allowLeave.current = true
    navigate('/rotinas', { replace: true })
  }

  // Mensagem ao lado do botão: diz POR QUE ele está ligado ou desligado.
  let status = t.routines.noChanges
  if (!nameFilled) {
    status = t.routines.needName
  } else if (dirty || isNew) {
    status = t.routines.unsaved
  }

  return (
    <>
      <ScreenHeader
        title={isNew ? t.routines.newTitle : t.routines.editorTitle}
        eyebrow={splitName}
      />

      {/* pb-36: espaço para a barra "Salvar" (fixa embaixo) não cobrir o fim da página. */}
      <div className="flex flex-col gap-8 px-4 py-6 pb-36">
        <div className="flex flex-col gap-4">
          <TextField
            label={t.routines.name}
            placeholder={t.routines.namePlaceholder}
            value={draft.name}
            onChange={(name) => change({ name })}
          />
          <TextField
            label={t.routines.notes}
            placeholder={t.routines.notesPlaceholder}
            multiline
            value={draft.notes}
            onChange={(notes) => change({ notes })}
          />
        </div>

        <Section title={t.routines.exercisesTitle} hint={t.routines.exercisesHint}>
          {draft.items.length === 0 ? (
            <p className="mb-3 text-muted">{t.routines.noExercises}</p>
          ) : (
            <ol className="mb-3 flex flex-col gap-2">
              {draft.items.map((item, index) => {
                const name = nameOf(item.exerciseId)
                const details = [
                  format.target(item.targetSets, item.targetRepsMin, item.targetRepsMax),
                  item.referenceWeightKg !== null
                    ? t.routines.reference(
                        format.reference(item.referenceWeightKg, item.referenceReps),
                      )
                    : null,
                ].filter(Boolean)

                return (
                  <li key={item.key} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingKey(item.key)}
                      aria-label={t.routines.editItem(name)}
                      className="flex min-h-14 min-w-0 flex-1 flex-col justify-center rounded-sm border-2 border-line-strong bg-surface px-3 py-2 text-left active:border-text"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-sm text-muted tabular-nums">
                        {details.join(' · ')}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={t.routines.moveUp(name)}
                      disabled={index === 0}
                      onClick={() =>
                        change({ items: moveDraftItem(draft.items, index, -1) })
                      }
                      className={arrowButtonClasses}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      type="button"
                      aria-label={t.routines.moveDown(name)}
                      disabled={index === draft.items.length - 1}
                      onClick={() =>
                        change({ items: moveDraftItem(draft.items, index, 1) })
                      }
                      className={arrowButtonClasses}
                    >
                      <ArrowDownIcon />
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          <Button fullWidth onClick={() => setPickerOpen(true)}>
            {t.routines.addExercise}
          </Button>
        </Section>

        <Section title={t.splits.ofRoutine} hint={t.splits.ofRoutineHint}>
          <SplitTabs splits={splits} activeId={draft.splitId} onSelect={chooseSplit} />
        </Section>

        <Section title={t.routines.sequence} hint={t.routines.sequenceHint}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-2xl font-bold tabular-nums">
              {t.routines.position(draft.position + 1, othersInSplit + 1)}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={draft.position <= 0}
                onClick={() => change({ position: draft.position - 1 })}
              >
                {t.routines.moveRoutineUp}
              </Button>
              <Button
                disabled={draft.position >= othersInSplit}
                onClick={() => change({ position: draft.position + 1 })}
              >
                {t.routines.moveRoutineDown}
              </Button>
            </div>
          </div>
        </Section>

        {!isNew && (
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(true)}>
            {t.routines.deleteRoutine}
          </Button>
        )}
      </div>

      {/* Barra "Salvar": fica na doca, acima das abas, e acompanha a rolagem. */}
      <DockItem>
        <div className="flex items-center gap-3 border-2 border-text bg-surface p-3">
          <p role="status" className="min-w-0 flex-1 text-sm font-semibold">
            {failed ? t.routines.saveFailed : status}
          </p>
          <Button variant="primary" disabled={!canSave} onClick={() => void handleSave()}>
            {t.common.save}
          </Button>
        </div>
      </DockItem>

      <RoutineItemSheet
        item={editingItem}
        exerciseName={editingItem ? nameOf(editingItem.exerciseId) : ''}
        onChange={(changes) =>
          editingKey !== null &&
          change({ items: updateDraftItem(draft.items, editingKey, changes) })
        }
        onRemove={() => {
          change({ items: draft.items.filter((item) => item.key !== editingKey) })
          setEditingKey(null)
        }}
        onClose={() => setEditingKey(null)}
      />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />

      <ConfirmSheet
        open={confirmDelete}
        title={t.routines.deleteTitle}
        description={t.routines.deleteDescription}
        confirmLabel={t.routines.deleteConfirm}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Tentou sair com alterações não salvas. */}
      <ConfirmSheet
        open={blocker.state === 'blocked'}
        title={t.routines.discardTitle}
        description={t.routines.discardDescription}
        confirmLabel={t.routines.discardConfirm}
        destructive
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
        onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      />
    </>
  )
}
