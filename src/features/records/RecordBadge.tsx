import { useI18n } from '../../i18n/context'

/**
 * "PR" badge on a set that is a personal record. Records are one of the two places the
 * accent color is allowed (with the primary action): red light = an achievement.
 * `aria-hidden`: the set's accessible name already says it is a record.
 */
export function RecordBadge() {
  const { t } = useI18n()
  return (
    <span
      aria-hidden="true"
      className="shrink-0 rounded-sm bg-accent px-1.5 text-xs font-bold tracking-wider text-text uppercase shadow-glow"
    >
      {t.records.badge}
    </span>
  )
}
