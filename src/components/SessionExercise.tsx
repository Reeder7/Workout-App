import { Icon } from './Icon'
import { RirStepper } from './RirStepper'
import { ExerciseNoteEditor } from './ExerciseNoteEditor'
import { describeScheme, ghostFor, goodGhostFor, isHoldOnly, lastLoggedSets } from '../lib/prescription'
import { exposureSymmetry, fmtLsi, lsiTone, LSI_TARGET, symmetryHistory } from '../lib/symmetry'
import { progressionAdvice } from '../lib/progression'
import { isExerciseDone, sinkDone } from '../lib/displayOrder'
import type { Exercise, LoggedExercise, LoggedSet, Session, SideSet } from '../types'

interface Props {
  ex: LoggedExercise
  meta?: Exercise
  unit: 'lb' | 'kg'
  sessions: Session[]
  note?: string
  notesOpen: boolean
  deload?: boolean
  onToggleNotes: () => void
  onUpdateSet: (setIndex: number, patch: Partial<LoggedSet>) => void
  onUpdateGood: (setIndex: number, patch: Partial<SideSet>) => void
  onTogglePerLeg: () => void
  onAddSet: () => void
  onRemoveSet: (setIndex: number) => void
  onStepRir: (setIndex: number, delta: number) => void
  onRest: (seconds: number) => void
  onGuide: () => void
  onSwap: () => void
  onRemove: () => void
}

export function SessionExercise({
  ex,
  meta,
  unit,
  sessions,
  note,
  notesOpen,
  deload,
  onToggleNotes,
  onUpdateSet,
  onUpdateGood,
  onTogglePerLeg,
  onAddSet,
  onRemoveSet,
  onStepRir,
  onRest,
  onGuide,
  onSwap,
  onRemove,
}: Props) {
  const last = lastLoggedSets(sessions, ex.exerciseId)
  const scheme = describeScheme(ex.sets)
  const hasNote = !!(note ?? '').trim()
  const holds = isHoldOnly(ex.sets)
  // Prior sessions only — advice about today shouldn't read today's own sets.
  const advice = progressionAdvice(meta, sessions, unit, { deload })

  /**
   * Completing a set fills anything still blank from the ghost values, so the
   * common case — same as last time, reps as prescribed — is a single tap.
   */
  function complete(si: number) {
    const st = ex.sets[si]
    const g = ghostFor(last, si, st.target)
    const patch: Partial<LoggedSet> = { done: true }
    if (!st.weight && g.weight) patch.weight = g.weight
    if (!st.reps && g.reps) patch.reps = g.reps
    if (st.rir == null && g.rir != null) patch.rir = g.rir
    // One tap completes both legs: the good side fills from its own ghost too.
    if (ex.perLeg) {
      const gg = goodGhostFor(last, si, g)
      const good = { weight: st.good?.weight ?? 0, reps: st.good?.reps ?? 0 }
      if (!good.weight && gg.weight) good.weight = gg.weight
      if (!good.reps && gg.reps) good.reps = gg.reps
      patch.good = good
    }
    onUpdateSet(si, patch)
    onRest(st.target?.restSec ?? ex.restSec ?? 120)
  }

  return (
    <div className={`card${isExerciseDone(ex) ? ' card-done' : ''}`}>
      <div className="row-between" style={{ gap: 'var(--space-2)' }}>
        <div className="grow">
          <div className="ex-name">{meta?.name ?? 'Exercise'}</div>
          <div className="faint ex-meta">
            {meta ? `${meta.primary} · ${meta.equipment}` : 'Custom'}
          </div>
        </div>
        <button className="icon-btn icon-btn-sm" onClick={onRemove} aria-label="Remove exercise">
          <Icon name="trash" size={16} />
        </button>
      </div>

      {scheme && <div className="presc">{scheme}</div>}

      {ex.perLeg && (() => {
        const today = exposureSymmetry(ex)
        const hist = symmetryHistory(sessions, ex.exerciseId)
        const prev = hist[hist.length - 1]
        const shown = today ?? prev
        if (!shown) {
          return (
            <div className="sym-strip">
              <span className="sym-label">Per leg</span>
              <span className="faint">Surgical side on top, good side below. Symmetry shows once both are logged.</span>
            </div>
          )
        }
        return (
          <div className={`sym-strip tone-${lsiTone(shown.lsi)}`}>
            <span className="sym-label">Symmetry</span>
            <span className="sym-value">{fmtLsi(shown.lsi)}</span>
            <span className="faint grow">
              {today ? 'today' : 'last time'}
              {today && prev ? ` · last ${fmtLsi(prev.lsi)}` : ''} · target {LSI_TARGET}%
            </span>
          </div>
        )
      })()}

      {advice.headline && (
        <div className={`advice tone-${advice.tone}`}>
          {/* An upward trend arrow would be wrong for a back-off or a deload. */}
          <Icon
            name={
              advice.verdict === 'add-load' || advice.verdict === 'add-reps' ? 'trend' : 'info'
            }
            size={14}
          />
          <span className="grow">{advice.headline}</span>
        </div>
      )}

      <div className="ex-actions">
        <button className="btn btn-sm btn-ghost" onClick={onGuide}>
          <Icon name="info" size={15} /> How to
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onToggleNotes}>
          <Icon name="note" size={15} /> Notes
          {hasNote && <span className="dot" aria-label="has a note" />}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onSwap}>
          <Icon name="swap" size={15} /> Swap
        </button>
        <button
          className={`btn btn-sm btn-ghost${ex.perLeg ? ' is-on' : ''}`}
          onClick={onTogglePerLeg}
          aria-pressed={!!ex.perLeg}
        >
          Per leg
        </button>
      </div>

      {notesOpen ? (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <ExerciseNoteEditor exerciseId={ex.exerciseId} compact />
        </div>
      ) : (
        hasNote && (
          <button className="note-strip" onClick={onToggleNotes}>
            <Icon name="note" size={13} className="faint" />
            <span className="truncate">{note}</span>
          </button>
        )
      )}

      <div className="setgrid setgrid-head">
        <div className="center">SET</div>
        <div className="center">{unit.toUpperCase()}</div>
        <div className="center">{holds ? 'SEC' : 'REPS'}</div>
        <div className="center">RIR</div>
        <div />
      </div>

      {sinkDone(ex.sets, (st) => st.done).map(({ item: st, index: si }) => {
        const g = ghostFor(last, si, st.target)
        const hold = st.target?.isHold
        const gg = goodGhostFor(last, si, g)
        return (
          <div key={si} className={ex.perLeg ? 'setpair' : undefined}>
          <div className={`setgrid setrow${st.done ? ' set-row-done' : ''}`}>
            <div className="set-num">{si + 1}</div>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              aria-label={`Set ${si + 1} weight in ${unit}`}
              value={st.weight || ''}
              placeholder={g.weight ? String(g.weight) : '—'}
              onChange={(e) =>
                onUpdateSet(si, { weight: Math.max(0, parseFloat(e.target.value) || 0) })
              }
            />
            <input
              type="number"
              inputMode="numeric"
              min="0"
              aria-label={`Set ${si + 1} ${hold ? 'seconds held' : 'reps'}`}
              value={st.reps || ''}
              placeholder={g.reps ? String(g.reps) : '—'}
              onChange={(e) =>
                onUpdateSet(si, { reps: Math.max(0, parseInt(e.target.value) || 0) })
              }
            />
            <RirStepper
              label={`Set ${si + 1} reps in reserve`}
              value={st.rir}
              ghost={g.rir}
              onStep={(delta) => onStepRir(si, delta)}
              onSet={(rir) => onUpdateSet(si, { rir })}
            />
            <button
              className={`set-done${st.done ? ' on' : ''}`}
              aria-label={st.done ? `Set ${si + 1}: mark incomplete` : `Complete set ${si + 1}`}
              aria-pressed={st.done}
              onContextMenu={(e) => {
                e.preventDefault()
                onRemoveSet(si)
              }}
              onClick={() => (st.done ? onUpdateSet(si, { done: false }) : complete(si))}
            >
              <Icon name="check" size={16} />
            </button>
          </div>
          {ex.perLeg && (
            <div className={`setgrid setrow setrow-good${st.done ? ' set-row-done' : ''}`}>
              <div className="side-tag" aria-hidden="true">G</div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                aria-label={`Set ${si + 1} good leg weight in ${unit}`}
                value={st.good?.weight || ''}
                placeholder={gg.weight ? String(gg.weight) : '—'}
                onChange={(e) =>
                  onUpdateGood(si, { weight: Math.max(0, parseFloat(e.target.value) || 0) })
                }
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={`Set ${si + 1} good leg ${hold ? 'seconds held' : 'reps'}`}
                value={st.good?.reps || ''}
                placeholder={gg.reps ? String(gg.reps) : '—'}
                onChange={(e) =>
                  onUpdateGood(si, { reps: Math.max(0, parseInt(e.target.value) || 0) })
                }
              />
              <div className="side-caption">good leg</div>
              <div />
            </div>
          )}
          </div>
        )
      })}

      <div className="row setfoot">
        <button className="btn btn-sm btn-ghost grow" onClick={onAddSet}>
          <Icon name="plus" size={14} /> Add set
        </button>
        {ex.sets.length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => onRemoveSet(ex.sets.length - 1)}>
            Remove set
          </button>
        )}
      </div>
    </div>
  )
}
