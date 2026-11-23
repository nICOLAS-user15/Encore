import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import type { BodyWeight } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { CloseIcon } from '../../ui/icons'
import { LineChart } from '../../ui/LineChart'
import { NumberStepper } from '../../ui/NumberStepper'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { useAction, useToast } from '../../ui/toastContext'
import { deleteBodyWeight, logBodyWeight, restoreBodyWeight } from './bodyWeightActions'
import { listBodyWeights } from './bodyWeightQueries'
import { bodyWeightSummary } from './bodyWeightStats'

/** Starting value of the field before the first measurement. */
const FIRST_GUESS_KG = 70
/** The chart shows the latest measurements only (a few months of daily weigh-ins). */
const CHART_POINTS = 60

/**
 * Route /peso: log the body weight and follow its trend. The field starts at the last
 * measurement (a scale moves a few hundred grams a day), so logging is usually one or
 * two taps on −/+ and "Registrar peso", the screen's only red button.
 */
export function BodyWeightScreen() {
  const { t } = useI18n()
  const entries = useLiveQuery(() => listBodyWeights(db), [])
  // Minute precision is enough for "the last 7 days".
  const now = useNow(60_000)

  if (!entries) {
    return (
      <>
        <ScreenHeader title={t.bodyWeight.title} />
        <div className="px-4 py-6">
          <SkeletonList />
        </div>
      </>
    )
  }

  const latestKg = entries.at(-1)?.weightKg ?? null

  return (
    <>
      <ScreenHeader title={t.bodyWeight.title} />
      <div className="flex flex-col gap-4 px-4 py-6">
        {/* `key`: after logging, the field restarts at the new latest value. */}
        <LogCard
          key={entries.at(-1)?.id ?? 'none'}
          initialKg={latestKg ?? FIRST_GUESS_KG}
        />
        {entries.length > 0 && <SummaryCard entries={entries} now={now} />}
        {entries.length > 1 && <TrendCard entries={entries} />}
        <EntryList entries={entries} />
      </div>
    </>
  )
}

function LogCard({ initialKg }: { initialKg: number }) {
  const { t } = useI18n()
  const run = useAction()
  const { showInfo } = useToast()
  const [weightKg, setWeightKg] = useState(initialKg)

  async function handleLog() {
    if ((await run(() => logBodyWeight(db, weightKg))) !== undefined) {
      showInfo(t.bodyWeight.logged)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <NumberStepper
        label={t.bodyWeight.weight}
        unit={t.common.kg}
        step={0.1}
        min={20}
        max={400}
        value={weightKg}
        onChange={setWeightKg}
      />
      <Button variant="primary" fullWidth onClick={() => void handleLog()}>
        {t.bodyWeight.log}
      </Button>
      <p className="text-sm text-muted">{t.bodyWeight.hint}</p>
    </Card>
  )
}

/** "+0,4 kg", "−0,7 kg" or "=" (typographic minus, like the workout comparison). */
function signedKg(value: number, kg: (value: number) => string): string {
  if (value === 0) {
    return '='
  }
  return `${value > 0 ? '+' : '−'}${kg(Math.abs(value))}`
}

function SummaryCard({ entries, now }: { entries: BodyWeight[]; now: number }) {
  const { t, format } = useI18n()
  const summary = bodyWeightSummary(entries, now)
  const kg = (value: number) => `${format.decimal(value)} ${t.common.kg}`

  const stats = [
    { label: t.bodyWeight.latest, value: summary.latestKg },
    { label: t.bodyWeight.weekAverage, value: summary.weekAverageKg },
  ]

  return (
    <Card>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col justify-between gap-1">
            <dt className="text-xs font-semibold tracking-widest text-muted uppercase">
              {stat.label}
            </dt>
            <dd className="truncate font-display text-xl font-bold tabular-nums">
              {stat.value === null ? '—' : kg(stat.value)}
            </dd>
          </div>
        ))}
        <div className="flex min-w-0 flex-col justify-between gap-1">
          <dt className="text-xs font-semibold tracking-widest text-muted uppercase">
            {t.bodyWeight.weekChange}
          </dt>
          <dd className="truncate font-display text-xl font-bold tabular-nums">
            {summary.weekChangeKg === null ? '—' : signedKg(summary.weekChangeKg, kg)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

function TrendCard({ entries }: { entries: BodyWeight[] }) {
  const { t, format } = useI18n()
  const values = entries.slice(-CHART_POINTS).map((entry) => entry.weightKg)
  const kg = (value: number) => `${format.decimal(value)} ${t.common.kg}`

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
        {t.bodyWeight.chartTitle}
      </h2>
      <LineChart
        values={values}
        formatValue={kg}
        label={t.bodyWeight.chartSummary(
          kg(values[0]),
          kg(values[values.length - 1]),
          values.length,
        )}
      />
    </Card>
  )
}

function EntryList({ entries }: { entries: BodyWeight[] }) {
  const { t, format } = useI18n()
  const run = useAction()
  const { showUndo } = useToast()

  async function handleDelete(entry: BodyWeight) {
    const deletedId = await run(() => deleteBodyWeight(db, entry.id))
    if (deletedId !== undefined) {
      showUndo(t.bodyWeight.deleted, () => restoreBodyWeight(db, deletedId))
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-2xl leading-tight font-bold uppercase">
        {t.bodyWeight.entries}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{t.bodyWeight.empty}</p>
      ) : (
        <ol aria-label={t.bodyWeight.entries} className="flex flex-col">
          {/* Newest first: the last weigh-in is the one you look for. */}
          {[...entries].reverse().map((entry) => {
            const date = `${format.workoutDate(entry.measuredAt)} · ${format.time(entry.measuredAt)}`
            return (
              <li
                key={entry.id}
                className="flex min-h-12 items-center justify-between gap-3 border-b border-line last:border-b-0"
              >
                <span className="text-sm text-muted">{date}</span>
                <span className="ml-auto font-display text-xl font-bold tabular-nums">
                  {format.decimal(entry.weightKg)} {t.common.kg}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry)}
                  aria-label={t.bodyWeight.deleteEntry(date)}
                  className="flex size-12 shrink-0 items-center justify-center text-muted active:text-text [&>svg]:size-5"
                >
                  <CloseIcon />
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
