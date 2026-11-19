type LineChartProps = {
  /** Values in chronological order (one per session). Needs at least 2. */
  values: number[]
  /** Text for the axis labels (e.g. "95 kg"). */
  formatValue: (value: number) => string
  /** What the chart shows, for screen readers (e.g. "1RM: from 80 to 95 kg in 6 sessions"). */
  label: string
}

// Drawing space (SVG user units). The SVG stretches to the card width.
const WIDTH = 320
const HEIGHT = 140
const PAD = { top: 16, right: 12, bottom: 16, left: 12 }

/**
 * Small line chart, drawn by hand in SVG: no chart library (it would add ~100 kB to an
 * offline-first bundle to draw one line). Points are evenly spaced (one per session,
 * not per calendar day), the line uses the accent light and the last point, "today",
 * is highlighted. Only the lowest and highest values are labelled, to keep it clean.
 */
export function LineChart({ values, formatValue, label }: LineChartProps) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat line (same value every time) still needs a range to be drawn in the middle.
  const span = max - min || 1
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom

  const points = values.map((value, index) => ({
    x:
      PAD.left +
      (values.length === 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth),
    y: PAD.top + innerHeight - ((value - min) / span) * innerHeight,
  }))
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className="h-auto w-full overflow-visible"
    >
      {/* Guides at the highest and lowest values, with their labels. */}
      {[PAD.top, PAD.top + innerHeight].map((y) => (
        <line
          key={y}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y}
          y2={y}
          className="stroke-line"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}
      <text x={PAD.left} y={PAD.top - 5} className="fill-muted text-xs font-semibold">
        {formatValue(max)}
      </text>
      {max !== min && (
        <text
          x={PAD.left}
          y={PAD.top + innerHeight + 14}
          className="fill-muted text-xs font-semibold"
        >
          {formatValue(min)}
        </text>
      )}

      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="none"
        className="stroke-accent-bright"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={3}
          className="fill-background stroke-accent-bright"
          strokeWidth={2}
        />
      ))}
      {/* The most recent session: a filled point with a halo. */}
      <circle cx={last.x} cy={last.y} r={9} className="fill-accent-bright opacity-20" />
      <circle cx={last.x} cy={last.y} r={5} className="fill-accent-bright" />
    </svg>
  )
}
