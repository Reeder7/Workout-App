import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { Icon } from '../components/Icon'
import { ExercisePicker } from '../components/ExercisePicker'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { ExerciseGuide } from '../components/ExerciseGuide'
import { ExerciseNoteEditor } from '../components/ExerciseNoteEditor'
import { SwapSheet } from '../components/SwapSheet'
import { fmtWeight } from '../lib/format'
import type { Session as SessionType } from '../types'

function useElapsed(startedAt?: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!startedAt) return '0:00'
  const s = Math.max(0, Math.floor((now - startedAt) / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

/** Find the most recent completed set performance for an exercise. */
function lastPerformance(sessions: SessionType[], exerciseId: string): string | null {
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.length) {
      const best = ex.sets.reduce((a, b) => (b.weight >= a.weight ? b : a))
      return `${fmtWeight(best.weight)} × ${best.reps}`
    }
  }
  return null
}

export function Session() {
  const nav = useNavigate()
  const active = useStore((s) => s.activeSession)
  const sessions = useStore((s) => s.sessions)
  const unit = useStore((s) => s.settings.unit)
  const allExercises = useStore((s) => s.allExercises())

  const addExercise = useStore((s) => s.addExerciseToActive)
  const removeExercise = useStore((s) => s.removeExerciseFromActive)
  const swapExercise = useStore((s) => s.swapExerciseInActive)
  const addSet = useStore((s) => s.addSet)
  const updateSet = useStore((s) => s.updateSet)
  const removeSet = useStore((s) => s.removeSet)
  const finish = useStore((s) => s.finishSession)
  const discard = useStore((s) => s.discardActiveSession)

  const exerciseNotes = useStore((s) => s.exerciseNotes)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [guideFor, setGuideFor] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState<Record<number, boolean>>({})
  const [swapIndex, setSwapIndex] = useState<number | null>(null)

  const elapsed = useElapsed(active?.date)

  const exerciseById = (id: string) =>
    EXERCISE_BY_ID[id] ?? allExercises.find((e) => e.id === id)
  const exerciseName = (id: string) => exerciseById(id)?.name ?? 'Exercise'

  const completedSets = useMemo(
    () =>
      active?.exercises.reduce((t, ex) => t + ex.sets.filter((s) => s.done).length, 0) ?? 0,
    [active],
  )

  if (!active) {
    return (
      <div className="app">
        <div className="empty">
          <div className="empty-emoji">🏋️</div>
          <p>No active workout.</p>
          <button className="btn btn-primary" onClick={() => nav('/')}>
            Go to Train
          </button>
        </div>
      </div>
    )
  }

  function startRest(seconds: number) {
    setRestEndsAt(Date.now() + seconds * 1000)
  }

  return (
    <div className="app">
      <div className="row-between" style={{ marginBottom: 2 }}>
        <button className="icon-btn" onClick={() => nav('/')} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
        <div className="pill mono">
          <Icon name="timer" size={13} /> {elapsed}
        </div>
      </div>

      <h1 className="page-title" style={{ fontSize: 24, marginTop: 8 }}>
        {active.name}
      </h1>
      <p className="page-sub">
        {active.exercises.length} exercises · {completedSets} sets done
      </p>

      {active.exercises.map((ex, ei) => {
        const meta = exerciseById(ex.exerciseId)
        const last = lastPerformance(sessions, ex.exerciseId)
        return (
          <div className="card" key={`${ex.exerciseId}-${ei}`}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <div className="grow">
                <div style={{ fontWeight: 640, fontSize: 16 }}>
                  {exerciseName(ex.exerciseId)}
                </div>
                <div className="faint" style={{ fontSize: 12 }}>
                  {meta ? `${meta.primary} · ${meta.equipment}` : 'Custom'}
                  {last && <span> · last: {last}</span>}
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  removeExercise(ei)
                  setNotesOpen({})
                }}
                aria-label="Remove exercise"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setGuideFor(ex.exerciseId)}
              >
                <Icon name="info" size={15} /> How to
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setNotesOpen((o) => ({ ...o, [ei]: !o[ei] }))}
              >
                <Icon name="note" size={15} /> Notes
                {(exerciseNotes[ex.exerciseId] ?? '').trim() && (
                  <span className="accent" style={{ marginLeft: 2 }}>
                    •
                  </span>
                )}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setSwapIndex(ei)}>
                <Icon name="swap" size={15} /> Swap
              </button>
            </div>

            {notesOpen[ei] ? (
              <ExerciseNoteEditor exerciseId={ex.exerciseId} compact />
            ) : (
              (exerciseNotes[ex.exerciseId] ?? '').trim() && (
                <button
                  onClick={() => setNotesOpen((o) => ({ ...o, [ei]: true }))}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    marginBottom: 4,
                  }}
                >
                  <span className="hint" style={{ margin: 0, fontStyle: 'italic' }}>
                    {exerciseNotes[ex.exerciseId]}
                  </span>
                </button>
              )
            )}

            <div className="setgrid setgrid-head" style={{ marginTop: 10 }}>
              <div className="center">SET</div>
              <div className="center">{unit.toUpperCase()}</div>
              <div className="center">REPS</div>
              <div className="center">RIR</div>
              <div></div>
            </div>

            {ex.sets.map((st, si) => (
              <div key={si}>
                {st.target && (
                  <div className="set-target">
                    {st.target.label && (
                      <span className="pill pill-accent set-target-label">
                        {st.target.label}
                      </span>
                    )}
                    <span className="faint">
                      {st.target.isHold
                        ? `${st.target.repMin}${
                            st.target.repMax !== st.target.repMin ? `–${st.target.repMax}` : ''
                          }s hold`
                        : `${st.target.repMin}–${st.target.repMax} reps`}
                      {' · '}
                      {st.target.rir} RIR
                      {st.target.tempo ? ` · ${st.target.tempo}` : ''}
                    </span>
                  </div>
                )}
                <div
                  className={`setgrid${st.done ? ' set-row-done' : ''}`}
                  style={{ marginBottom: 8 }}
                >
                <div className="set-num">{si + 1}</div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={st.weight || ''}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(ei, si, { weight: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={st.reps || ''}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(ei, si, { reps: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={st.rir ?? ''}
                  placeholder="—"
                  onChange={(e) =>
                    updateSet(ei, si, {
                      rir:
                        e.target.value === ''
                          ? undefined
                          : Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                />
                <button
                  className={`set-done${st.done ? ' on' : ''}`}
                  aria-label="Complete set"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    removeSet(ei, si)
                  }}
                  onClick={() => {
                    const nowDone = !st.done
                    updateSet(ei, si, { done: nowDone })
                    if (nowDone) startRest(st.target?.restSec ?? ex.restSec ?? 120)
                  }}
                >
                  <Icon name="check" size={16} />
                </button>
                </div>
              </div>
            ))}

            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <button className="btn btn-sm btn-ghost grow" onClick={() => addSet(ei)}>
                <Icon name="plus" size={14} /> Add set
              </button>
              {ex.sets.length > 0 && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => removeSet(ei, ex.sets.length - 1)}
                >
                  Remove set
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 12 }}
        onClick={() => setPickerOpen(true)}
      >
        <Icon name="plus" size={16} /> Add exercise
      </button>

      <div className="spacer" />
      <button className="btn btn-danger btn-block" onClick={() => setConfirmFinish(true)}>
        Finish or discard workout
      </button>

      {restEndsAt && (
        <RestTimer
          endsAt={restEndsAt}
          onExtend={(sec) => setRestEndsAt((v) => (v ? v + sec * 1000 : null))}
          onDismiss={() => setRestEndsAt(null)}
        />
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(e) => addExercise(e.id)}
      />

      <Sheet
        open={!!guideFor}
        onClose={() => setGuideFor(null)}
        title={guideFor ? exerciseName(guideFor) : ''}
      >
        {guideFor && <ExerciseGuide exercise={exerciseById(guideFor)} />}
      </Sheet>

      <SwapSheet
        exerciseId={swapIndex != null ? active.exercises[swapIndex]?.exerciseId ?? null : null}
        onClose={() => setSwapIndex(null)}
        onSwap={(id) => swapIndex != null && swapExercise(swapIndex, id)}
        warning={
          swapIndex != null && active.exercises[swapIndex]?.sets.some((st) => st.done)
            ? 'You have completed sets on this exercise. Swapping keeps the set structure but clears those logged numbers.'
            : undefined
        }
      />

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finish workout?">
        <p className="hint" style={{ marginTop: 0 }}>
          Only sets marked complete (✓) are saved. {completedSets} set
          {completedSets === 1 ? '' : 's'} logged.
        </p>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 8 }}
          onClick={() => {
            finish()
            setConfirmFinish(false)
            nav('/')
          }}
        >
          <Icon name="check" size={18} /> Finish & save
        </button>
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            discard()
            setConfirmFinish(false)
            nav('/')
          }}
        >
          Discard workout
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 6 }}
          onClick={() => setConfirmFinish(false)}
        >
          Keep going
        </button>
      </Sheet>
    </div>
  )
}
