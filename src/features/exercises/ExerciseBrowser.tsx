import { useState } from 'react'
import { LANGUAGES, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { nameKey } from '../../lib/text'
import { Button } from '../../ui/Button'
import { EXERCISE_KINDS, exerciseKind, type ExerciseKind } from './exerciseKind'

/** A busca procura nos dois idiomas: "supino" e "bench" encontram o mesmo exercício. */
function matchesSearch(exercise: Exercise, search: string): boolean {
  return LANGUAGES.some((language) => nameKey(exercise.names[language]).includes(search))
}

type ExerciseBrowserProps = {
  exercises: Exercise[]
  /** Se passado, cada exercício vira um botão (modo "escolher exercício"). */
  onSelect?: (exercise: Exercise) => void
  /**
   * Se passado, a busca oferece "+ Criar" quando o nome digitado não existe na
   * biblioteca. Recebe o nome digitado.
   */
  onCreate?: (name: string) => void
}

/**
 * Lista de exercícios com três filtros que se somam: tipo (livres/máquinas),
 * busca por nome e grupo muscular.
 */
export function ExerciseBrowser({ exercises, onSelect, onCreate }: ExerciseBrowserProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  // `null` = todos os tipos.
  const [kind, setKind] = useState<ExerciseKind | null>(null)

  const search = nameKey(query)
  const filtered = exercises.filter(
    (exercise) =>
      (kind === null || exerciseKind(exercise.equipment) === kind) &&
      (group === null || exercise.muscleGroup === group) &&
      matchesSearch(exercise, search),
  )

  // Só oferece criar se o nome ainda não existe (em nenhum idioma): sobre a lista
  // INTEIRA, e não a filtrada, para um filtro de grupo não esconder o duplicado.
  const typedName = query.trim().replace(/\s+/g, ' ')
  const canCreate =
    onCreate !== undefined &&
    typedName !== '' &&
    !exercises.some((exercise) =>
      LANGUAGES.some(
        (language) => nameKey(exercise.names[language]) === nameKey(typedName),
      ),
    )

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de tipo: três partes coladas, a escolhida em cores invertidas. */}
      <div
        role="group"
        aria-label={t.exercises.kindLabel}
        className="grid grid-cols-3 rounded-sm border-2 border-line-strong"
      >
        <KindButton active={kind === null} onClick={() => setKind(null)}>
          {t.exercises.kinds.all}
        </KindButton>
        {EXERCISE_KINDS.map((item) => (
          <KindButton key={item} active={kind === item} onClick={() => setKind(item)}>
            {t.exercises.kinds[item]}
          </KindButton>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.exercises.search}
        aria-label={t.exercises.search}
        className="min-h-12 w-full rounded-sm border-2 border-line-strong bg-background px-3 text-text placeholder:text-muted focus:border-text"
      />

      {canCreate && (
        <Button fullWidth onClick={() => onCreate(typedName)}>
          {t.exercises.createNamed(typedName)}
        </Button>
      )}

      {/* Filtros: rolam para o lado no celular. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip active={group === null} onClick={() => setGroup(null)}>
          {t.exercises.all}
        </FilterChip>
        {MUSCLE_GROUPS.map((item) => (
          <FilterChip key={item} active={group === item} onClick={() => setGroup(item)}>
            {t.muscleGroups[item]}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted">{t.exercises.noResults}</p>
      ) : (
        <GroupedList exercises={filtered} onSelect={onSelect} />
      )}
    </div>
  )
}

function KindButton({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-12 px-2 font-display text-base font-semibold tracking-wide uppercase',
        active ? 'bg-text text-background' : 'text-muted active:text-text',
      )}
    >
      {children}
    </button>
  )
}

type FilterChipProps = {
  active: boolean
  onClick: () => void
  children: string
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-12 shrink-0 rounded-sm border-2 px-4 text-sm font-semibold tracking-wide uppercase',
        // Ativo = cores invertidas (claro sobre escuro), sem usar o acento.
        active ? 'border-text bg-text text-background' : 'border-line-strong text-muted',
      )}
    >
      {children}
    </button>
  )
}

function GroupedList({ exercises, onSelect }: ExerciseBrowserProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-8">
      {MUSCLE_GROUPS.map((group) => {
        const items = exercises.filter((exercise) => exercise.muscleGroup === group)
        if (items.length === 0) {
          return null
        }
        return (
          <section key={group} aria-label={t.muscleGroups[group]}>
            <h2 className="flex items-baseline justify-between border-b-2 border-text pb-1 font-display text-xl font-bold uppercase">
              {t.muscleGroups[group]}
              <span className="font-sans text-sm font-semibold text-muted tabular-nums">
                {items.length}
              </span>
            </h2>
            <ul>
              {items.map((exercise) => (
                <li key={exercise.id} className="border-b border-line">
                  <ExerciseRow exercise={exercise} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

type ExerciseRowProps = {
  exercise: Exercise
  onSelect?: (exercise: Exercise) => void
}

function ExerciseRow({ exercise, onSelect }: ExerciseRowProps) {
  const { t, exerciseName } = useI18n()
  const content = (
    <>
      <span className="font-medium">{exerciseName(exercise)}</span>
      <span className="shrink-0 text-sm text-muted">
        {t.equipment[exercise.equipment]}
      </span>
    </>
  )
  const classes = 'flex min-h-14 w-full items-center justify-between gap-4 text-left'

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(exercise)}
        className={cn(classes, 'active:bg-background')}
      >
        {content}
      </button>
    )
  }
  return <div className={classes}>{content}</div>
}
