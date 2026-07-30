interface Props {
  value?: number
  /** Shown greyed when no value is set — what completing the set would log. */
  ghost?: number
  /** Stepping is resolved against live store state, not this render's value. */
  onStep: (delta: number) => void
  onSet: (value: number | undefined) => void
  label: string
}

const MAX_RIR = 6

/**
 * RIR is a 0–6 judgement call, so a numeric keypad is the wrong control — on a
 * phone it covers half the screen mid-set. Stepping avoids that entirely.
 * Long-press clears back to unlogged.
 */
export function RirStepper({ value, ghost, onStep, onSet, label }: Props) {
  const shown = value ?? ghost
  const isGhost = value == null

  return (
    <div className="rir" role="group" aria-label={label}>
      <button
        type="button"
        className="rir-step"
        onClick={() => onStep(-1)}
        aria-label={`${label}: decrease`}
        disabled={shown != null && shown <= 0}
      >
        −
      </button>
      <button
        type="button"
        className={`rir-value${isGhost ? ' is-ghost' : ''}`}
        onClick={() => onSet(shown ?? 2)}
        onContextMenu={(e) => {
          e.preventDefault()
          onSet(undefined)
        }}
        aria-label={`${label}${isGhost ? ' (not logged yet)' : ''}`}
      >
        {shown ?? '—'}
      </button>
      <button
        type="button"
        className="rir-step"
        onClick={() => onStep(1)}
        aria-label={`${label}: increase`}
        disabled={shown != null && shown >= MAX_RIR}
      >
        +
      </button>
    </div>
  )
}
