import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { ExercisePicker } from './ExercisePicker'
import { useStore } from '../store/useStore'
import { similarExercises } from '../lib/similar'
import type { Exercise } from '../types'

interface Props {
  /** Exercise id being replaced, or null when closed. */
  exerciseId: string | null
  onClose: () => void
  onSwap: (newExerciseId: string) => void
  /** Extra warning shown when the swap will clear logged sets. */
  warning?: string
}

/**
 * Sheet for replacing an exercise with a similar one. Shows ranked substitutes
 * (same muscle / role first) and falls back to the full exercise browser.
 */
export function SwapSheet({ exerciseId, onClose, onSwap, warning }: Props) {
  const all = useStore((s) => s.allExercises())
  const [browseAll, setBrowseAll] = useState(false)

  const target = exerciseId ? all.find((e) => e.id === exerciseId) : undefined
  const options = useMemo(
    () => (target ? similarExercises(target, all) : []),
    [target, all],
  )

  function pick(e: Exercise) {
    onSwap(e.id)
    setBrowseAll(false)
    onClose()
  }

  return (
    <>
      <Sheet
        open={!!exerciseId && !browseAll}
        onClose={onClose}
        title={target ? `Swap ${target.name}` : 'Swap exercise'}
      >
        {warning && (
          <div className="caution-banner">
            <span className="caution-icon">⚠</span>
            <span className="hint" style={{ margin: 0 }}>
              {warning}
            </span>
          </div>
        )}
        <p className="hint" style={{ marginTop: 0 }}>
          Alternatives that train the same muscle in a similar role — machine, cable and free-weight
          versions included, so you can work around a busy rack or a cranky joint.
        </p>

        {options.map((e) => (
          <button
            key={e.id}
            className="lrow"
            style={{ width: '100%', textAlign: 'left', background: 'none' }}
            onClick={() => pick(e)}
          >
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {e.primary} · {e.equipment} · {e.category}
              </div>
            </div>
            <span className="accent" style={{ fontSize: 13, fontWeight: 640 }}>
              Swap
            </span>
          </button>
        ))}
        {options.length === 0 && (
          <p className="faint center" style={{ padding: '14px 0' }}>
            No close matches — browse the full library instead.
          </p>
        )}

        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 14 }}
          onClick={() => setBrowseAll(true)}
        >
          Browse all exercises
        </button>
      </Sheet>

      <ExercisePicker
        open={browseAll}
        onClose={() => {
          setBrowseAll(false)
          onClose()
        }}
        onPick={pick}
      />
    </>
  )
}
