import { useI18n } from '../i18n/context'
import { cn } from '../lib/cn'
import { PERIODS, type Period } from '../lib/period'

type PeriodTabsProps = {
  value: Period
  onChange: (period: Period) => void
}

/** 3M / 1A / Tudo above a chart. Selected = inverted colors (no accent: not an action). */
export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  const { t } = useI18n()
  return (
    <div
      role="group"
      aria-label={t.common.period.label}
      className="grid grid-cols-3 gap-1"
    >
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          aria-pressed={value === period}
          aria-label={t.common.period.names[period]}
          onClick={() => onChange(period)}
          className={cn(
            'min-h-12 rounded-sm border-2 font-display text-lg font-semibold uppercase',
            value === period
              ? 'border-text bg-text text-background'
              : 'border-line-strong text-muted',
          )}
        >
          {t.common.period.short[period]}
        </button>
      ))}
    </div>
  )
}
