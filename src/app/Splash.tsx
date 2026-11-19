import { useEffect, useState } from 'react'
import { Logo } from '../ui/Logo'

/**
 * Duração total da entrada (deve bater com o fim de `splash-out` no theme.css:
 * 1550 + 250 ms). O selo fica ~1s parado na tela, para dar tempo de ver.
 */
export const SPLASH_DURATION_MS = 1800

/** `true` se o usuário pediu "reduzir movimento" no sistema (acessibilidade). */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Animação de entrada: o selo "carimba", uma barra vermelha corre embaixo e a
 * tela some. Aparece só ao abrir o app (fica fora do router, então trocar de
 * aba não a repete). Com "reduzir movimento" ligado, não aparece.
 */
export function Splash() {
  // A função passada ao useState só roda na primeira renderização.
  const [visible, setVisible] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    if (!visible) {
      return
    }
    const id = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    // aria-hidden: é só visual; leitores de tela vão direto para o app.
    <div
      aria-hidden="true"
      data-testid="splash"
      // Um toque pula a entrada: quem abre o app na academia quer o treino, não a animação.
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-splash-out"
    >
      <div className="flex flex-col items-center gap-6">
        <Logo variant="stamp" className="h-44 w-auto animate-splash-stamp" />
        <div className="h-1.5 w-28 origin-left bg-accent animate-splash-bar" />
      </div>
    </div>
  )
}
