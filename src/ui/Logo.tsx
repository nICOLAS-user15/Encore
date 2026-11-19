import { cn } from '../lib/cn'

/*
 * Logo do Encore (opção C, "Selo"): EN / CO / RE, com "RE" (de novo) em vermelho.
 * Cada letra é desenhada com retângulos numa grade 60 × 100 (traço 20), então o
 * logo não depende de nenhuma fonte. É o mesmo desenho de public/logo.svg.
 */

const GLYPHS = {
  E: 'M0 0h60v20H20v20h30v20H20v20h40v20H0z',
  N: 'M0 0H20L40 60V0H60V100H40L20 40V100H0Z',
  C: 'M0 0h60v20H20v60h40v20H0z',
  O: 'M0 0h60v100H0z M20 20v60h20V20z',
  R: 'M0 0H60V60H44L60 100H40L26 60H20V100H0Z M20 20V40H40V20Z',
} as const

type Letter = keyof typeof GLYPHS

/** Uma letra na posição (x, y), na escala dada. */
function Glyph({
  letter,
  x,
  y,
  scale = 1,
  accent = false,
}: {
  letter: Letter
  x: number
  y: number
  scale?: number
  accent?: boolean
}) {
  return (
    <path
      d={GLYPHS[letter]}
      transform={`translate(${x} ${y}) scale(${scale})`}
      fillRule="evenodd"
      className={accent ? 'fill-accent' : 'fill-text'}
    />
  )
}

/**
 * ENCORE com "falha de impressão": usada ao abrir o menu lateral. Roda uma vez,
 * quando aparece. A logo pula em fatias e uma cópia vermelha desalinhada
 * (como tinta fora do registro) pisca e some. Animações no theme.css (glitch).
 * `className` define a altura (ex.: "h-6").
 */
export function GlitchWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block', className)}>
      {/* Cópia vermelha: só visual, escondida de leitores de tela. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-glitch-ghost [&_path]:fill-accent"
      >
        <Logo variant="wordmark" className="h-full w-auto" />
      </span>
      <span className="block h-full animate-glitch">
        <Logo variant="wordmark" className="h-full w-auto" />
      </span>
    </span>
  )
}

type LogoProps = {
  /** `stamp`: o selo vertical (ícone). `wordmark`: ENCORE numa linha. */
  variant: 'stamp' | 'wordmark'
  className?: string
}

export function Logo({ variant, className }: LogoProps) {
  if (variant === 'wordmark') {
    const letters: Letter[] = ['E', 'N', 'C', 'O', 'R', 'E']
    return (
      <svg viewBox="0 0 420 100" role="img" aria-label="Encore" className={className}>
        {letters.map((letter, index) => (
          <Glyph
            key={index}
            letter={letter}
            x={index * 72}
            y={0}
            // As duas últimas letras ("RE") vão no acento.
            accent={index >= 4}
          />
        ))}
      </svg>
    )
  }

  // Selo: moldura + três linhas de duas letras (mesmas coordenadas do logo.svg).
  const rows: Array<[Letter, Letter, number, boolean]> = [
    ['E', 'N', 124, false],
    ['C', 'O', 216, false],
    ['R', 'E', 308, true],
  ]
  return (
    <svg viewBox="175 96 162 320" role="img" aria-label="Encore" className={className}>
      <path
        d="M175 96h162v320H175z M187 108v296h138V108z"
        fillRule="evenodd"
        className="fill-text"
      />
      {rows.map(([first, second, y, accent]) => (
        <g key={y}>
          <Glyph letter={first} x={203} y={y} scale={0.8} accent={accent} />
          <Glyph letter={second} x={260.6} y={y} scale={0.8} accent={accent} />
        </g>
      ))}
    </svg>
  )
}
