interface Props {
  value: number
  max: number
  size?: number
  stroke?: number
  /** Big number in the middle. Defaults to `value`. */
  center?: string
  /** Small text under the number. */
  caption?: string
}

/**
 * Circular progress. Caps the sweep at 100% but still reports the raw value,
 * so an over-target week reads as full rather than wrapping past the start.
 */
export function ProgressRing({ value, max, size = 72, stroke = 6, center, caption }: Props) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const complete = max > 0 && value >= max

  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} of ${max}${caption ? ` ${caption}` : ''}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={`ring-fill${complete ? ' is-complete' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-value">{center ?? value}</span>
        {caption && <span className="ring-caption">{caption}</span>}
      </div>
    </div>
  )
}
