import { db } from '../../db/db'
import { LOADED_EQUIPMENT, type Language } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { Section } from '../../ui/Section'
import { BackupSection } from './BackupSection'
import { REST_OPTIONS, updateSettings, WEIGHT_STEP_OPTIONS } from './settingsRepository'
import { useSettings } from './useSettings'

/** Each language written IN ITSELF: someone who cannot read the current language recognizes theirs. */
const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
]

export function SettingsScreen() {
  const { t, format } = useI18n()
  const { settings } = useSettings()

  // Each tap saves immediately (no "Salvar" button); the screen updates via useLiveQuery.
  const save = (changes: Parameters<typeof updateSettings>[1]) =>
    void updateSettings(db, changes)

  return (
    <>
      <ScreenHeader title={t.settings.title} />
      <div className="flex flex-col gap-8 px-4 py-6">
        <Section title={t.settings.language}>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                active={settings.language === option.value}
                onClick={() => save({ language: option.value })}
                lang={option.value}
              >
                {option.label}
              </OptionButton>
            ))}
          </div>
        </Section>

        <Section title={t.settings.rest}>
          <p className="mb-2 text-sm text-muted">{t.settings.restDuration}</p>
          <div className="grid grid-cols-4 gap-2">
            {REST_OPTIONS.map((seconds) => (
              <OptionButton
                key={seconds}
                active={settings.restSeconds === seconds}
                onClick={() => save({ restSeconds: seconds })}
              >
                {formatClock(seconds * 1000)}
              </OptionButton>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <ToggleRow
              label={t.settings.autoStartRest}
              checked={settings.autoStartRest}
              onChange={(autoStartRest) => save({ autoStartRest })}
            />
            <ToggleRow
              label={t.settings.restSound}
              checked={settings.restSound}
              onChange={(restSound) => save({ restSound })}
            />
          </div>
        </Section>

        <Section title={t.settings.duringWorkout}>
          <ToggleRow
            label={t.settings.keepScreenOn}
            checked={settings.keepScreenOn}
            onChange={(keepScreenOn) => save({ keepScreenOn })}
          />
        </Section>

        <Section title={t.settings.weightSteps}>
          <p className="mb-3 text-sm text-muted">{t.settings.weightStepsHint}</p>
          <div className="flex flex-col gap-4">
            {LOADED_EQUIPMENT.map((equipment) => (
              <div key={equipment} role="group" aria-label={t.equipment[equipment]}>
                <p className="mb-1 font-medium">{t.equipment[equipment]}</p>
                <div className="grid grid-cols-6 gap-1">
                  {WEIGHT_STEP_OPTIONS.map((step) => (
                    <OptionButton
                      key={step}
                      active={settings.weightStepsKg[equipment] === step}
                      onClick={() =>
                        // Writes the whole object, changing only this equipment.
                        save({
                          weightStepsKg: { ...settings.weightStepsKg, [equipment]: step },
                        })
                      }
                    >
                      {format.decimal(step)}
                    </OptionButton>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <BackupSection />
      </div>
    </>
  )
}

type ToggleRowProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** On/off row (role="switch": screen readers announce "on/off"). */
function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-sm border-2 border-line-strong bg-surface px-4 text-left shadow-edge active:border-text"
    >
      <span className="font-medium">{label}</span>
      {/* aria-hidden: role="switch" + aria-checked already state the status; the badge is visual. */}
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 border-2 px-2 py-0.5 text-xs font-bold tracking-wider uppercase',
          checked
            ? 'border-text bg-text text-background'
            : 'border-line-strong text-muted',
        )}
      >
        {checked ? t.settings.on : t.settings.off}
      </span>
    </button>
  )
}

type OptionButtonProps = {
  active: boolean
  onClick: () => void
  children: string
  /** Language of the button text (helps screen readers pronounce it correctly). */
  lang?: string
}

function OptionButton({ active, onClick, children, lang }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      lang={lang}
      className={cn(
        'min-h-12 rounded-sm border-2 px-1 font-display text-lg font-semibold tabular-nums',
        // Selected = inverted colors (no accent: it is not a main action).
        active ? 'border-text bg-text text-background' : 'border-line-strong text-muted',
      )}
    >
      {children}
    </button>
  )
}
