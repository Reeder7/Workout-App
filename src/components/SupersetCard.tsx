import { Icon } from './Icon'
import {
  ExerciseHead,
  SetGridHead,
  SetRow,
  completePatch,
  type ExerciseHandlers,
  type ExerciseView,
} from './SessionExercise'
import { isHoldOnly, lastLoggedSets } from '../lib/prescription'
import { isExerciseDone } from '../lib/displayOrder'

export interface SupersetMember {
  view: ExerciseView
  handlers: ExerciseHandlers
}

interface Props {
  letter: string
  members: SupersetMember[]
  unit: 'lb' | 'kg'
}

/**
 * A superset as one card. The exercises stack at the top, then the sets run in
 * rounds — B1 set 1, B2 set 1, then round 2 — so the order on screen is the
 * order you lift in. A finished round sinks below the ones still to do.
 *
 * Rest: the first exercise's rest is the pause between exercises (0 = go
 * straight on), and the last exercise's rest is the one after the round.
 */
export function SupersetCard({ letter, members, unit }: Props) {
  const lasts = members.map((m) => lastLoggedSets(m.view.sessions, m.view.ex.exerciseId))
  const rounds = Math.max(0, ...members.map((m) => m.view.ex.sets.length))
  const holds = members.every((m) => isHoldOnly(m.view.ex.sets))
  const allDone = members.every((m) => isExerciseDone(m.view.ex))

  const roundDone = (r: number) =>
    members.every((m) => {
      const st = m.view.ex.sets[r]
      return !st || st.done
    })
  const order = Array.from({ length: rounds }, (_, r) => r)
  const sorted = [...order.filter((r) => !roundDone(r)), ...order.filter((r) => roundDone(r))]
  const current = order.find((r) => !roundDone(r))

  const between = members[0].view.ex.sets[0]?.target?.restSec ?? 0
  const after =
    members[members.length - 1].view.ex.sets[0]?.target?.restSec ??
    members[members.length - 1].view.ex.restSec ??
    90

  function complete(k: number, r: number) {
    const m = members[k]
    m.handlers.onUpdateSet(r, completePatch(m.view.ex, r, lasts[k]))
    const others = members.some((o, j) => j !== k && o.view.ex.sets[r] && !o.view.ex.sets[r].done)
    if (others) {
      // Mid-round: the short pause before the next exercise, if one is set.
      const t = members[0].view.ex.sets[r]?.target?.restSec ?? between
      if (t > 0) m.handlers.onRest(t)
    } else {
      const lastMember = members[members.length - 1].view.ex.sets[r]
      m.handlers.onRest(lastMember?.target?.restSec ?? after)
    }
  }

  function workNo(k: number, r: number) {
    return members[k].view.ex.sets.slice(0, r + 1).filter((x) => !x.target?.warmup).length
  }

  return (
    <div className={`card ss-card${allDone ? ' card-done' : ''}`}>
      <div className="ss-head">
        <span className="ss-title">Superset {letter}</span>
        <span className="faint">
          {current != null ? `Round ${current + 1} of ${rounds}` : `${rounds} rounds done`}
          {' · '}
          {between > 0 ? `${between}s between` : 'straight through'}, {after}s after the round
        </span>
      </div>

      {members.map((m, k) => (
        <div key={k} className="ss-member">
          <ExerciseHead {...m.view} {...m.handlers} tag={`${letter}${k + 1}`} />
        </div>
      ))}

      <SetGridHead unit={unit} holds={holds} />

      {sorted.map((r) => {
        const warmRound = members.every((m) => {
          const st = m.view.ex.sets[r]
          return !st || !!st.target?.warmup
        })
        const n = members.map((_, k) => workNo(k, r)).find((x) => x > 0) ?? r + 1
        return (
          <div key={r} className={`ss-round${roundDone(r) ? ' is-done' : ''}`}>
            <div className="ss-round-label">{warmRound ? 'Warm-up round' : `Round ${n}`}</div>
            {members.map((m, k) =>
              m.view.ex.sets[r] ? (
                <SetRow
                  key={k}
                  ex={m.view.ex}
                  si={r}
                  last={lasts[k]}
                  unit={unit}
                  chip={`${letter}${k + 1}`}
                  warm={!!m.view.ex.sets[r].target?.warmup}
                  onUpdateSet={m.handlers.onUpdateSet}
                  onUpdateGood={m.handlers.onUpdateGood}
                  onStepRir={m.handlers.onStepRir}
                  onRemoveSet={m.handlers.onRemoveSet}
                  onComplete={() => complete(k, r)}
                />
              ) : null,
            )}
          </div>
        )
      })}

      <div className="row setfoot">
        <button
          className="btn btn-sm btn-ghost grow"
          onClick={() => members.forEach((m) => m.handlers.onAddSet())}
        >
          <Icon name="plus" size={14} /> Add round
        </button>
        {rounds > 0 && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() =>
              members.forEach((m) => {
                const len = m.view.ex.sets.length
                if (len > 0 && len === rounds) m.handlers.onRemoveSet(len - 1)
              })
            }
          >
            Remove round
          </button>
        )}
      </div>
    </div>
  )
}
