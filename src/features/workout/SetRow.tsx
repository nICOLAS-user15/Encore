import { useState } from 'react'
import type { SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { CheckIcon } from '../../ui/icons'

type SetRowProps = {
  set: SetEntry
  /** Rótulo à esquerda: número da série (1, 2, 3...) ou "AQ" no aquecimento. */
  label: number | string
  /** Nome do exercício, só para o nome acessível do botão. */
  exerciseName: string
  /** É a próxima série a fazer ("onde estou"): ganha borda clara. */
  isNext: boolean
  onEdit: () => void
  onToggle: () => void
}

/**
 * Uma série: tocar na linha abre o editor; tocar no ✓ conclui (ou desfaz).
 * Os dois alvos são grandes e separados para não errar com a mão suada.
 *
 * Três estados visuais, sem cor nova: próxima (borda clara), pendente (borda
 * escura) e concluída (✓ invertido, números apagados: já ficou para trás).
 */
export function SetRow({
  set,
  label,
  exerciseName,
  isNext,
  onEdit,
  onToggle,
}: SetRowProps) {
  const { t, format } = useI18n()
  const completed = set.completedAt !== null
  const warmup = set.type === 'warmup'
  // O ✓ "carimba" só quando o usuário acabou de tocar nele, e não sempre que
  // uma série concluída aparece na tela (ex.: ao voltar para o treino).
  const [justTapped, setJustTapped] = useState(false)

  function handleToggle() {
    setJustTapped(!completed)
    onToggle()
  }

  return (
    // aria-current="step": leitores de tela anunciam "passo atual".
    <li className="flex items-stretch gap-2" aria-current={isNext ? 'step' : undefined}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t.workout.editSet(
          label,
          `${exerciseName}, ${format.set(set.weightKg, set.reps)}`,
        )}
        className={cn(
          // transition-colors: o destaque de "próxima" passa de uma série à outra suavemente.
          'flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-sm border-2 bg-background px-3 text-left transition-colors duration-200 active:border-text',
          isNext ? 'border-text' : 'border-line-strong',
        )}
      >
        <span className="w-6 shrink-0 font-display text-lg font-semibold text-muted tabular-nums">
          {label}
        </span>
        <span
          className={cn(
            'font-display font-bold tabular-nums',
            // Aquecimento menor: o olho vai direto para as séries de trabalho.
            warmup ? 'text-xl' : 'text-2xl',
            // Aquecimento e séries concluídas em tom apagado.
            (warmup || completed) && 'text-muted',
          )}
        >
          {format.decimal(set.weightKg)}
          <span className="text-base font-semibold text-muted"> {t.common.kg}</span>
          <span className="text-muted"> × </span>
          {set.reps}
        </span>
        {set.type === 'encore' && (
          <span className="ml-auto shrink-0 border-2 border-line px-1.5 text-xs font-bold tracking-wider text-muted uppercase">
            {t.workout.encore}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={completed}
        aria-label={completed ? t.workout.undoSet(label) : t.workout.completeSet(label)}
        className={cn(
          // active:scale-90: o botão afunda sob o dedo (confirma que o toque pegou).
          'flex size-14 shrink-0 items-center justify-center rounded-sm border-2 transition-transform duration-75 active:scale-90 [&>svg]:size-7',
          // A classe entra quando a série vira "concluída" depois do toque: carimba uma vez.
          completed && justTapped && 'animate-stamp',
          // Concluída = cores invertidas. Sem acento: ele fica para PRs.
          completed && 'border-text bg-text text-background',
          // Próxima: ✓ com borda e ícone claros, chamando o toque.
          !completed &&
            (isNext ? 'border-text text-text' : 'border-line-strong text-muted'),
        )}
      >
        <CheckIcon />
      </button>
    </li>
  )
}
