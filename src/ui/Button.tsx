import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * `primary` usa a cor de acento: reserve para a ação principal da tela (uma só).
   * `destructive` (claro sobre escuro) confirma algo que apaga: o vermelho
   * significa "vai" e "recorde", então não pode significar também "apagar".
   */
  variant?: ButtonVariant
  /** Ocupa a largura toda do container. */
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-accent bg-accent text-text active:border-accent-pressed active:bg-accent-pressed',
  secondary: 'border-line-strong bg-surface text-text active:border-text',
  ghost: 'border-transparent bg-transparent text-muted active:text-text',
  destructive: 'border-text bg-text text-background active:border-muted active:bg-muted',
}

export function Button({
  variant = 'secondary',
  fullWidth = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // min-h-12 = 48px: alvo de toque mínimo.
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border-2 px-5',
        'font-display text-lg font-semibold tracking-wide uppercase',
        'disabled:pointer-events-none disabled:opacity-40',
        // Afunda um pouco sob o dedo: confirma o toque mesmo antes de a ação terminar.
        'transition duration-100 active:scale-[0.97]',
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
