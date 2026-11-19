import { useId } from 'react'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** `true` = campo de várias linhas (textarea). */
  multiline?: boolean
}

/** Campo de texto com rótulo, no estilo do app (borda grossa, fonte ≥ 16px). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: TextFieldProps) {
  // useId gera um id único para ligar o <label> ao campo (acessibilidade).
  const id = useId()
  const classes =
    'w-full rounded-sm border-2 border-line-strong bg-background px-3 py-2 text-text placeholder:text-muted focus:border-text'

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold tracking-widest text-muted uppercase"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={classes}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-12 ${classes}`}
        />
      )}
    </div>
  )
}
