import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { parseDecimal } from '../lib/format'
import { MinusIcon, PlusIcon } from './icons'

type NumberStepperProps = {
  /** Nome do campo, usado no rótulo e na acessibilidade (ex.: "Carga"). */
  label: string
  value: number
  onChange: (value: number) => void
  /** Quanto cada toque soma/subtrai. Ex.: 2.5 para carga, 1 para repetições. */
  step?: number
  min?: number
  max?: number
  /** Texto pequeno ao lado do número (ex.: "kg", "reps"). */
  unit?: string
  /** Teclado com vírgula. Padrão: só quando o passo é decimal (ex.: 2,5). */
  decimal?: boolean
}

/** Evita lixo de ponto flutuante (ex.: 0.1 + 0.2 = 0.30000000000000004). */
function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Campo numérico com botões grandes de − e +, pensado para usar com a mão suada
 * no meio da série. Os botões têm 64px (bem acima do mínimo de 48px).
 * O número no meio também é um campo de texto: tocar nele abre o teclado numérico.
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
  // Enquanto o usuário digita, guardamos o TEXTO (ex.: "12," ainda não é número).
  // `null` = não está digitando, então mostramos o `value` formatado.
  const [draft, setDraft] = useState<string | null>(null)

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, roundToHundredths(next)))
  }

  function change(delta: number) {
    // Sai do modo digitação: no iOS o toque no botão não tira o foco do campo, e o
    // texto digitado ficaria na tela mostrando um número diferente do valor.
    setDraft(null)
    onChange(clamp(value + delta))
  }

  function handleTyping(text: string) {
    setDraft(text)
    // Cada número válido já vai para o pai, sem esperar o campo perder o foco:
    // no iPhone, tocar num botão NÃO tira o foco do campo, então um valor que
    // só fosse salvo no "blur" se perderia ao tocar direto em "Concluir série".
    // Texto inválido (ou vazio) não muda nada: fica valendo o último número.
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
            // Teclado numérico no celular; com vírgula quando `decimal`.
            inputMode={decimal ? 'decimal' : 'numeric'}
            aria-label={label}
            value={draft ?? format.decimal(value)}
            onFocus={(event) => {
              setDraft(format.decimal(value))
              event.target.select()
            }}
            onChange={(event) => handleTyping(event.target.value)}
            // Ao sair do campo, volta a mostrar o valor formatado (ex.: "12," -> "12").
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
