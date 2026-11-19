import { useId } from 'react'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** `true` = multi-line field (textarea). */
  multiline?: boolean
}

/** Text field with a label, in the app's style (thick border, font ≥ 16px). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: TextFieldProps) {
  // useId generates a unique id to link the <label> to the field (accessibility).
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
