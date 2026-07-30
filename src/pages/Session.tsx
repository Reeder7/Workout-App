import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { Icon } from '../components/Icon'
import { ExercisePicker } from '../components/ExercisePicker'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ExerciseGuide } from '../components/ExerciseGuide'
import { SessionExercise } from '../components/SessionExercise'
import { SwapSheet } from '../components/SwapSheet'
import { ShareWorkoutButton } from '../components/ShareWorkoutButton'
import { toast } from '../lib/toast'
import { DELOAD } from '../lib/mesocycle'
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
  const stepRir = useStore((s) => s.stepRir)
  const finish = useStore((s) => s.finishSession)
  const discard = useStore((s) => s.discardActiveSession)

  const exerciseNotes = useStore((s) => s.exerciseNotes)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [guideFor, setGuideFor] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState<Record<number, boolean>>({})
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [finished, setFinished] = useState<SessionType | null>(null)

  const elapsed = useElapsed(active?.date)

  const exerciseById = (id: string) =>
    EXERCISE_BY_ID[id] ?? allExercises.find((e) => e.id === id)
  const exerciseName = (id: string) => exerciseById(id)?.name ?? 'Exercise'

  const totals = useMemo(() => {
    let done = 0
    let total = 0
    active?.exercises.forEach((ex) => {
      total += ex.sets.length
      done += ex.sets.filter((s) => s.done).length
    })
    return { done, total }
  }, [active])

  if (!active) {
    // Straight after finishing, offer the summary card before leaving — this is
    // the one moment the workout is worth sharing.
    if (finished) {
      const setsLogged = finished.exercises.reduce((t, ex) => t + ex.sets.length, 0)
      return (
        <div className="app">
          <EmptyState
            glyph="barbell"
            title="Workout saved"
            body={`${finished.name} · ${setsLogged} set${setsLogged === 1 ? '' : 's'} logged.`}
          >
            <ShareWorkoutButton session={finished} className="btn btn-primary" />
            <button className="btn btn-ghost" onClick={() => nav('/')}>
              Done
            </button>
          </EmptyState>
        </div>
      )
    }
    return (
      <div className="app">
        <EmptyState
          glyph="barbell"
          title="No active workout"
          body="Pick a plan on the Train tab to start logging sets."
        >
          <button className="btn btn-primary" onClick={() => nav('/')}>
            Go to Train
          </button>
        </EmptyState>
      </div>
    )
  }

  function startRest(seconds: number) {
    setRestEndsAt(Date.now() + seconds * 1000)
  }

  return (
    <div className="app">
      <PageHeader
        title={active.name}
        sub={
          <>
            <Icon name="timer" size={12} /> {elapsed} · {totals.done} of {totals.total} sets
          </>
        }
        onBack={() => nav('/')}
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => setConfirmFinish(true)}>
            <Icon name="check" size={15} /> Finish
          </button>
        }
      />

      {active.deload && (
        <div className="block-strip is-deload" style={{ marginTop: 0 }}>
          <div className="block-week">Deload session</div>
          <div className="block-sub">
            Sets are already cut and RIR raised. {DELOAD.summary}
          </div>
        </div>
      )}

      {active.exercises.map((ex, ei) => (
        <SessionExercise
          key={`${ex.exerciseId}-${ei}`}
          ex={ex}
          meta={exerciseById(ex.exerciseId)}
          unit={unit}
          sessions={sessions}
          note={exerciseNotes[ex.exerciseId]}
          notesOpen={!!notesOpen[ei]}
          deload={active.deload}
          onToggleNotes={() => setNotesOpen((o) => ({ ...o, [ei]: !o[ei] }))}
          onUpdateSet={(si, patch) => updateSet(ei, si, patch)}
          onAddSet={() => addSet(ei)}
          onRemoveSet={(si) => removeSet(ei, si)}
          onStepRir={(si, delta) => stepRir(ei, si, delta)}
          onRest={startRest}
          onGuide={() => setGuideFor(ex.exerciseId)}
          onSwap={() => setSwapIndex(ei)}
          onRemove={() => {
            removeExercise(ei)
            setNotesOpen({})
            toast('Exercise removed')
          }}
        />
      ))}

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
        detent="large"
      >
        {guideFor && <ExerciseGuide exercise={exerciseById(guideFor)} />}
      </Sheet>

      <SwapSheet
        exerciseId={swapIndex != null ? active.exercises[swapIndex]?.exerciseId ?? null : null}
        onClose={() => setSwapIndex(null)}
        onSwap={(id) => {
          if (swapIndex == null) return
          swapExercise(swapIndex, id)
          toast('Exercise swapped', 'success')
        }}
        warning={
          swapIndex != null && active.exercises[swapIndex]?.sets.some((st) => st.done)
            ? 'You have completed sets on this exercise. Swapping keeps the set structure but clears those logged numbers.'
            : undefined
        }
      />

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finish workout?">
        <p className="hint" style={{ marginTop: 0 }}>
          Only sets marked complete (✓) are saved. {totals.done} set
          {totals.done === 1 ? '' : 's'} logged.
        </p>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 8 }}
          onClick={() => {
            finish()
            setConfirmFinish(false)
            // finishSession prunes incomplete sets, so read back what was
            // actually stored rather than reusing the in-progress copy.
            const saved = useStore.getState().sessions[0]
            if (saved) {
              setFinished(saved)
              toast(`Workout saved · ${totals.done} sets`, 'success')
            } else {
              toast('Nothing to save — no sets were completed')
              nav('/')
            }
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
            toast('Workout discarded')
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
