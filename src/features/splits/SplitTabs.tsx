import type { ID, Split } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'

type SplitTabsProps = {
  splits: Split[]
  activeId: ID | null
  onSelect: (splitId: ID) => void
  /** Se passado, mostra o botão "+ Nova divisão" no fim da fileira. */
  onAdd?: () => void
}

const chipClasses =
  'min-h-12 shrink-0 rounded-sm border-2 px-4 font-display text-lg font-semibold tracking-wide uppercase transition active:scale-[0.97]'

/**
 * Abas das divisões de treino: uma fileira de botões que rola para o lado no
 * celular. A escolhida fica em cores invertidas (como os outros filtros do app).
 */
export function SplitTabs({ splits, activeId, onSelect, onAdd }: SplitTabsProps) {
  const { t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t.splits.tabsLabel}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {splits.map((split) => (
        <button
          key={split.id}
          type="button"
          aria-pressed={split.id === activeId}
          onClick={() => onSelect(split.id)}
          className={cn(
            chipClasses,
            split.id === activeId
              ? 'border-text bg-text text-background'
              : 'border-line-strong text-muted',
          )}
        >
          {split.name}
        </button>
      ))}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          // Tracejado: parece "um lugar vazio para preencher", não uma divisão.
          className={cn(chipClasses, 'border-dashed border-line-strong text-muted')}
        >
          {t.splits.newSplit}
        </button>
      )}
    </div>
  )
}
