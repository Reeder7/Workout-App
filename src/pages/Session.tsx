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
import { SessionExercise, type ExerciseHandlers } from '../components/SessionExercise'
import { SupersetCard } from '../components/SupersetCard'
import { blocksOf } from '../lib/superset'
import { isExerciseDone, sinkDone } from '../lib/displayOrder'
import { SwapSheet } from '../components/SwapSheet'
import { ShareWorkoutButton } from '../components/ShareWorkoutButton'
import { toast } from '../lib/toast'
import { DELOAD } from '../lib/mesocycle'
import { KNEE_MUSCLES } from '../lib/knee'
import { PainScale } from '../components/PainScale'
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
  const updateGoodSide = useStore((s) => s.updateGoodSide)
  const togglePerLeg = useStore((s) => s.togglePerLeg)
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
  const [kneePain, setKneePain] = useState<number | undefined>(undefined)

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

  // Ask about the knee only when the session touched it.
  const kneeSession = active.exercises.some((ex) => {
    const m = exerciseById(ex.exerciseId)
    return !!m && KNEE_MUSCLES.has(m.primary)
  })

  function startRest(seconds: number) {
    if (seconds <= 0) return
    setRestEndsAt(Date.now() + seconds * 1000)
  }

  // Handlers address the exercise's index in the stored array, never its
  // position on screen, so re-ordering can't make a tap land on the wrong one.
  const handlersFor = (ei: number): ExerciseHandlers => ({
    onToggleNotes: () => setNotesOpen((o) => ({ ...o, [ei]: !o[ei] })),
    onUpdateSet: (si, patch) => updateSet(ei, si, patch),
    onUpdateGood: (si, patch) => updateGoodSide(ei, si, patch),
    onTogglePerLeg: () => togglePerLeg(ei),
    onAddSet: () => addSet(ei),
    onRemoveSet: (si) => removeSet(ei, si),
    onStepRir: (si, delta) => stepRir(ei, si, delta),
    onRest: startRest,
    onGuide: () => setGuideFor(active.exercises[ei].exerciseId),
    onSwap: () => setSwapIndex(ei),
    onRemove: () => {
      removeExercise(ei)
      setNotesOpen({})
      toast('Exercise removed')
    },
  })
  const viewFor = (ei: number) => {
    const ex = active.exercises[ei]
    return {
      ex,
      meta: exerciseById(ex.exerciseId),
      unit,
      sessions,
      note: exerciseNotes[ex.exerciseId],
      notesOpen: !!notesOpen[ei],
      deload: active.deload,
    }
  }
  // A superset sinks as a unit, once every exercise in it is done.
  const blocks = sinkDone(blocksOf(active.exercises), (b) =>
    b.indices.every((i) => isExerciseDone(active.exercises[i])),
  )

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

      {active.stepBack && (
        <div className="block-strip is-deload" style={{ marginTop: 0 }}>
          <div className="block-week">Stepped back today</div>
          <div className="block-sub">
            From this morning’s knee check-in: one set fewer on leg exercises, and each set a rep
            further from failure. Keep depth and box height where they were last week.
          </div>
        </div>
      )}

      {blocks.map(({ item: b }) =>
        b.isSuperset ? (
          <SupersetCard
            key={`ss-${b.indices.join('-')}-${active.exercises[b.indices[0]].exerciseId}`}
            letter={b.letter}
            unit={unit}
            members={b.indices.map((ei) => ({ view: viewFor(ei), handlers: handlersFor(ei) }))}
          />
        ) : (
          <SessionExercise
            key={`${active.exercises[b.indices[0]].exerciseId}-${b.indices[0]}`}
            {...viewFor(b.indices[0])}
            {...handlersFor(b.indices[0])}
          />
        ),
      )}

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
        {kneeSession && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div className="knee-q" style={{ marginTop: 'var(--space-2)' }}>
              Worst knee pain during this session
            </div>
            <PainScale value={kneePain} onChange={setKneePain} label="Worst knee pain this session" />
            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
              Optional. Tomorrow’s check-in is compared with it, so you can see which sessions the knee
              answers to.
            </div>
          </div>
        )}
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 8 }}
          onClick={() => {
            finish({ kneePain })
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
