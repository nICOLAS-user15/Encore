import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { parseDecimal } from '../lib/format'
import { MinusIcon, PlusIcon } from './icons'

type NumberStepperProps = {
  /** Field name, used in the label and for accessibility (e.g. "Carga"). */
  label: string
  value: number
  onChange: (value: number) => void
  /** How much each tap adds/subtracts. E.g. 2.5 for load, 1 for reps. */
  step?: number
  min?: number
  max?: number
  /** Small text next to the number (e.g. "kg", "reps"). */
  unit?: string
  /** Keyboard with a comma. Default: only when the step is decimal (e.g. 2,5). */
  decimal?: boolean
}

/** Avoids floating-point junk (e.g. 0.1 + 0.2 = 0.30000000000000004). */
function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Numeric field with big − and + buttons, designed to use with a sweaty hand
 * in the middle of a set. The buttons are 64px (well above the 48px minimum).
 * The number in the middle is also a text field: tapping it opens the numeric keyboard.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  unit,
  decimal = !Number.isInteger(step),
}: NumberStepperProps) {
  const { t, format } = useI18n()
  // While the user types, we keep the TEXT (e.g. "12," is not a number yet).
  // `null` = not typing, so we show the formatted `value`.
  const [draft, setDraft] = useState<string | null>(null)

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, roundToHundredths(next)))
  }

  function change(delta: number) {
    // Leaves typing mode: on iOS tapping the button does not take focus off the field, and the
    // typed text would stay on screen showing a number different from the value.
    setDraft(null)
    onChange(clamp(value + delta))
  }

  function handleTyping(text: string) {
    setDraft(text)
    // Each valid number goes to the parent right away, without waiting for the field to lose focus:
    // on iPhone, tapping a button does NOT take focus off the field, so a value that
    // was only saved on "blur" would be lost when tapping "Concluir série" directly.
    // Invalid (or empty) text changes nothing: the last number stays.
    const parsed = parseDecimal(text)
    if (parsed !== null) {
      onChange(clamp(parsed))
    }
  }

  const buttonClasses =
    'flex size-16 shrink-0 items-center justify-center rounded-sm border-2 border-line-strong bg-surface text-text active:border-text disabled:opacity-30 [&>svg]:size-7'

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClasses}
          onClick={() => change(-step)}
          disabled={value <= min}
          aria-label={t.common.decrease(label)}
        >
          <MinusIcon />
        </button>
        <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1 font-display tabular-nums">
          <input
            type="text"
            // Numeric keyboard on mobile; with a comma when `decimal`.
            inputMode={decimal ? 'decimal' : 'numeric'}
            aria-label={label}
            value={draft ?? format.decimal(value)}
            onFocus={(event) => {
              setDraft(format.decimal(value))
              event.target.select()
            }}
            onChange={(event) => handleTyping(event.target.value)}
            // When leaving the field, shows the formatted value again (e.g. "12," -> "12").
            onBlur={() => setDraft(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
            className="w-full min-w-0 bg-transparent text-center text-5xl leading-none font-bold text-text"
          />
          {unit && <span className="text-lg text-muted">{unit}</span>}
        </label>
        <button
          type="button"
          className={buttonClasses}
          onClick={() => change(step)}
          disabled={value >= max}
          aria-label={t.common.increase(label)}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
