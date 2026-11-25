import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/context'
import { AnimatedNumber } from '../../ui/AnimatedNumber'
import { Card } from '../../ui/Card'
import type { MuscleVolume } from './weeklyVolume'

/**
 * "This week": total volume and one horizontal bar per muscle group, longest first.
 * Answers the question every lifter asks on Friday: "did I train everything?".
 * Bars are relative to the biggest group (by volume; by sets when it is all bodyweight).
 */
export function WeeklyVolumeCard({
  volumes,
  children,
}: {
  volumes: MuscleVolume[]
  /** Footer (the History screen puts the link to the 8-week trend there). */
  children?: ReactNode
}) {
  const { t, format } = useI18n()
  const total = volumes.reduce((sum, entry) => sum + entry.volumeKg, 0)
  const byVolume = total > 0
  const biggest = Math.max(
    1,
    ...volumes.map((entry) => (byVolume ? entry.volumeKg : entry.sets)),
  )

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight font-bold uppercase">
          {t.history.thisWeek}
        </h2>
        {total > 0 && (
          <p className="font-display text-xl font-bold tabular-nums">
            <AnimatedNumber value={total} format={format.volume} />
          </p>
        )}
      </div>

      {volumes.length === 0 ? (
        <p className="text-sm text-muted">{t.history.weeklyEmpty}</p>
      ) : (
        <ul aria-label={t.history.weeklyLabel} className="flex flex-col gap-2.5">
          {volumes.map((entry) => {
            const size = (byVolume ? entry.volumeKg : entry.sets) / biggest
            return (
              <li key={entry.muscleGroup} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {t.muscleGroups[entry.muscleGroup]}
                  </span>
                  <span className="text-muted tabular-nums">
                    {entry.volumeKg > 0 && `${format.volume(entry.volumeKg)} · `}
                    {t.history.setCount(entry.sets)}
                  </span>
                </div>
                <div aria-hidden="true" className="h-1.5 rounded-sm bg-line">
                  <div
                    className="h-full rounded-sm bg-text transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(4, size * 100)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {children}
    </Card>
  )
}
