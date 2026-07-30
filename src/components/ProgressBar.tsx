type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface Props {
  value: number
  max: number
  tone?: Tone
  height?: number
  /** Draws a reference notch inside the track, e.g. a volume landmark. */
  marker?: number
  markerLabel?: string
}

export function ProgressBar({
  value,
  max,
  tone = 'accent',
  height = 8,
  marker,
  markerLabel,
}: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const markerPct =
    marker != null && max > 0 ? Math.min(100, Math.max(0, (marker / max) * 100)) : null

  return (
    <div className="bar" style={{ height }} role="presentation">
      <div className={`bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      {markerPct != null && (
        <span
          className="bar-marker"
          style={{ left: `${markerPct}%` }}
          title={markerLabel}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
