interface Props {
  value?: number
  onChange: (value: number | undefined) => void
  label: string
  /** Offer a "Not yet" option that leaves the value unset. */
  allowSkip?: boolean
}

/**
 * A 0–10 pain scale as two rows of large tap targets. Eleven options in one
 * row are too small to hit reliably on a phone; a slider is too easy to nudge.
 * Tapping the selected number again clears it.
 */
export function PainScale({ value, onChange, label, allowSkip }: Props) {
  return (
    <div>
      <div className="pain-scale" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={`pain-opt${value === n ? ' on' : ''}`}
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
        {allowSkip && (
          <button
            type="button"
            role="radio"
            aria-checked={value == null}
            className={`pain-opt pain-skip${value == null ? ' on' : ''}`}
            onClick={() => onChange(undefined)}
          >
            Not yet
          </button>
        )}
      </div>
      <div className="pain-anchors faint">
        <span>0 none</span>
        <span>3 program limit</span>
        <span>10 worst</span>
      </div>
    </div>
  )
}
