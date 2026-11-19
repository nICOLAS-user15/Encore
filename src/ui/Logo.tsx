import { cn } from '../lib/cn'

/*
 * Encore logo (option C, "Stamp"): EN / CO / RE, with "RE" (again) in red.
 * Each letter is drawn with rectangles on a 60 × 100 grid (stroke 20), so the
 * logo does not depend on any font. It is the same drawing as public/logo.svg.
 */

const GLYPHS = {
  E: 'M0 0h60v20H20v20h30v20H20v20h40v20H0z',
  N: 'M0 0H20L40 60V0H60V100H40L20 40V100H0Z',
  C: 'M0 0h60v20H20v60h40v20H0z',
  O: 'M0 0h60v100H0z M20 20v60h20V20z',
  R: 'M0 0H60V60H44L60 100H40L26 60H20V100H0Z M20 20V40H40V20Z',
} as const

type Letter = keyof typeof GLYPHS

/** One letter at position (x, y), at the given scale. */
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
 * ENCORE with a "print glitch": used when the side menu opens. Runs once,
 * when it appears. The logo jumps in slices and a misaligned red copy
 * (like ink out of register) flashes and disappears. Animations in theme.css (glitch).
 * `className` sets the height (e.g. "h-6").
 */
export function GlitchWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block', className)}>
      {/* Red copy: visual only, hidden from screen readers. */}
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
  /** `stamp`: the vertical stamp (icon). `wordmark`: ENCORE on one line. */
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
            // The last two letters ("RE") use the accent.
            accent={index >= 4}
          />
        ))}
      </svg>
    )
  }

  // Stamp: frame + three rows of two letters (same coordinates as logo.svg).
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
