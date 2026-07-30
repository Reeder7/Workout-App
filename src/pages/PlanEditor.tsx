import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore, uid } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { SwapSheet } from '../components/SwapSheet'
import { SharePlanButton } from '../components/SharePlanButton'
import { DEFAULTS } from '../data/landmarks'
import { VolumeBar } from '../components/VolumeBar'
import type { MuscleGroup, Plan, PlanDay, PlanExercise, PrescribedSet } from '../types'

export function PlanEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const plan = useStore((s) => s.plans.find((p) => p.id === id))
  const allExercises = useStore((s) => s.allExercises())
  const updatePlan = useStore((s) => s.updatePlan)
  const deletePlan = useStore((s) => s.deletePlan)
  const startSession = useStore((s) => s.startSession)
  const activeSession = useStore((s) => s.activeSession)
  const refreshFromTemplate = useStore((s) => s.refreshPlanFromTemplate)

  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editMeta, setEditMeta] = useState(false)
  const [confirmStart, setConfirmStart] = useState(false)
  const [swapPeId, setSwapPeId] = useState<string | null>(null)
  const [confirmRefresh, setConfirmRefresh] = useState(false)

  const exName = (eid: string) =>
    EXERCISE_BY_ID[eid]?.name ?? allExercises.find((e) => e.id === eid)?.name ?? 'Exercise'

  const weeklyVolume = useMemo(() => {
    if (!plan) return [] as [MuscleGroup, number][]
    const counts = {} as Record<string, number>
    for (const d of plan.days) {
      for (const pe of d.exercises) {
        const meta = EXERCISE_BY_ID[pe.exerciseId] ?? allExercises.find((e) => e.id === pe.exerciseId)
        if (!meta || meta.excludeFromVolume) continue
        const setCount = pe.scheme?.length ?? pe.sets
        counts[meta.primary] = (counts[meta.primary] ?? 0) + setCount
        for (const sec of meta.secondary) counts[sec] = (counts[sec] ?? 0) + setCount * 0.5
      }
    }
    return (Object.entries(counts) as [MuscleGroup, number][]).sort((a, b) => b[1] - a[1])
  }, [plan, allExercises])

  if (!plan) {
    return (
      <div className="app">
        <div className="empty">
          <p>Plan not found.</p>
          <button className="btn btn-primary" onClick={() => nav('/plans')}>
            Back to Plans
          </button>
        </div>
      </div>
    )
  }

  const currentDay = plan.days.find((d) => d.id === activeDayId) ?? plan.days[0]

  function save(mutator: (draft: Plan) => void) {
    const draft: Plan = structuredClone(plan!)
    mutator(draft)
    draft.daysPerWeek = draft.days.length
    updatePlan(draft)
  }

  function addDay() {
    const newId = uid('day')
    save((d) => {
      d.days.push({ id: newId, name: `Day ${d.days.length + 1}`, exercises: [] })
    })
    setActiveDayId(newId)
  }

  function updateDay(dayId: string, patch: Partial<PlanDay>) {
    save((d) => {
      const day = d.days.find((x) => x.id === dayId)
      if (day) Object.assign(day, patch)
    })
  }

  function deleteDay(dayId: string) {
    save((d) => {
      d.days = d.days.filter((x) => x.id !== dayId)
    })
    setActiveDayId(null)
  }

  function addExercise(exerciseId: string) {
    const meta = EXERCISE_BY_ID[exerciseId] ?? allExercises.find((e) => e.id === exerciseId)
    const isCompound = meta?.category === 'Compound'
    // Seed from the evidence-based defaults: compounds ~6–10 reps at 2–3 RIR with
    // longer rest; isolations ~10–15 reps with the last set closest to failure.
    const [rMin, rMax] =
      meta?.repRange ?? (isCompound ? DEFAULTS.compoundReps : DEFAULTS.isolationReps)
    const rest = isCompound ? DEFAULTS.compoundRestSec : DEFAULTS.isolationRestSec
    const rirs = isCompound ? [3, 2, 1] : [2, 1, 0]
    const scheme: PrescribedSet[] = rirs.map((rir) => ({
      repMin: rMin,
      repMax: rMax,
      rir,
      restSec: rest,
    }))
    const pe: PlanExercise = {
      id: uid('pe'),
      exerciseId,
      sets: scheme.length,
      repMin: rMin,
      repMax: rMax,
      rir: rirs[0],
      restSec: rest,
      scheme,
    }
    save((d) => {
      const day = d.days.find((x) => x.id === currentDay.id)
      day?.exercises.push(pe)
    })
  }

  function updateExercise(peId: string, patch: Partial<PlanExercise>) {
    save((d) => {
      const day = d.days.find((x) => x.id === currentDay.id)
      const pe = day?.exercises.find((e) => e.id === peId)
      if (pe) Object.assign(pe, patch)
    })
  }

  /** The authoritative per-set list: an explicit scheme, or one derived from the flat fields. */
  function schemeOf(pe: PlanExercise): PrescribedSet[] {
    if (pe.scheme && pe.scheme.length > 0) return pe.scheme
    return Array.from({ length: Math.max(1, pe.sets) }, () => ({
      repMin: pe.repMin,
      repMax: pe.repMax,
      rir: pe.rir,
      restSec: pe.restSec,
    }))
  }

  /** Write a scheme back, keeping the flat mirror fields in sync with set 1. */
  function writeScheme(peId: string, scheme: PrescribedSet[]) {
    const first = scheme[0]
    updateExercise(peId, {
      scheme,
      sets: scheme.length,
      repMin: first.repMin,
      repMax: first.repMax,
      rir: first.rir,
      restSec: first.restSec,
    })
  }

  function updateSetInScheme(pe: PlanExercise, index: number, patch: Partial<PrescribedSet>) {
    const scheme = schemeOf(pe).map((ps, i) => (i === index ? { ...ps, ...patch } : ps))
    writeScheme(pe.id, scheme)
  }

  function addSetToScheme(pe: PlanExercise) {
    const scheme = schemeOf(pe)
    const last = scheme[scheme.length - 1]
    writeScheme(pe.id, [...scheme, { ...last, label: undefined }])
  }

  function removeSetFromScheme(pe: PlanExercise, index: number) {
    const scheme = schemeOf(pe)
    if (scheme.length <= 1) return
    writeScheme(
      pe.id,
      scheme.filter((_, i) => i !== index),
    )
  }

  function removeExercise(peId: string) {
    save((d) => {
      const day = d.days.find((x) => x.id === currentDay.id)
      if (day) day.exercises = day.exercises.filter((e) => e.id !== peId)
    })
  }

  function moveExercise(peId: string, dir: -1 | 1) {
    save((d) => {
      const day = d.days.find((x) => x.id === currentDay.id)
      if (!day) return
      const i = day.exercises.findIndex((e) => e.id === peId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= day.exercises.length) return
      ;[day.exercises[i], day.exercises[j]] = [day.exercises[j], day.exercises[i]]
    })
  }

  return (
    <div className="app">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => nav('/plans')} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setShowVolume(true)}>
            <Icon name="chart" size={14} /> Volume
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              if (activeSession) {
                setConfirmStart(true)
              } else {
                startSession(plan, currentDay)
                nav('/session')
              }
            }}
          >
            <Icon name="play" size={14} /> Start
          </button>
        </div>
      </div>

      <button
        style={{ textAlign: 'left', background: 'none', width: '100%' }}
        onClick={() => setEditMeta(true)}
      >
        <h1 className="page-title" style={{ fontSize: 26 }}>
          {plan.name} <Icon name="edit" size={16} className="faint" />
        </h1>
      </button>
      {plan.description && <p className="page-sub">{plan.description}</p>}

      {/* Day tabs */}
      <div className="chips" style={{ marginTop: 8 }}>
        {plan.days.map((d) => (
          <button
            key={d.id}
            className={`chip${d.id === currentDay.id ? ' active' : ''}`}
            onClick={() => setActiveDayId(d.id)}
          >
            {d.name}
          </button>
        ))}
        <button className="chip" onClick={addDay}>
          + Day
        </button>
      </div>

      {/* Day header (rename / delete) */}
      <div className="row-between" style={{ margin: '14px 0 10px' }}>
        <input
          value={currentDay.name}
          onChange={(e) => updateDay(currentDay.id, { name: e.target.value })}
          style={{ fontWeight: 640, fontSize: 16 }}
        />
        {plan.days.length > 1 && (
          <button
            className="icon-btn"
            style={{ marginLeft: 8 }}
            onClick={() => deleteDay(currentDay.id)}
            aria-label="Delete day"
          >
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      {currentDay.exercises.length === 0 && (
        <div className="empty" style={{ padding: '28px 10px' }}>
          <p className="faint">No exercises in this day yet.</p>
        </div>
      )}

      {currentDay.exercises.map((pe, i) => (
        <div className="card" key={pe.id}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div className="grow">
              <div style={{ fontWeight: 640 }}>{exName(pe.exerciseId)}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {(EXERCISE_BY_ID[pe.exerciseId] ?? allExercises.find((e) => e.id === pe.exerciseId))
                  ?.primary ?? 'Custom'}
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => moveExercise(pe.id, -1)}
              disabled={i === 0}
              aria-label="Move up"
              style={{ opacity: i === 0 ? 0.3 : 1 }}
            >
              <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
                <Icon name="chevron" size={14} />
              </span>
            </button>
            <button
              className="icon-btn"
              onClick={() => moveExercise(pe.id, 1)}
              disabled={i === currentDay.exercises.length - 1}
              aria-label="Move down"
              style={{ opacity: i === currentDay.exercises.length - 1 ? 0.3 : 1 }}
            >
              <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                <Icon name="chevron" size={14} />
              </span>
            </button>
            <button
              className="icon-btn"
              onClick={() => setSwapPeId(pe.id)}
              aria-label="Swap exercise"
            >
              <Icon name="swap" size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={() => removeExercise(pe.id)}
              aria-label="Remove"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>

          {pe.role && (
            <div className="pill" style={{ marginBottom: 10 }}>
              {pe.role}
            </div>
          )}

          {/* Per-set prescription editor */}
          <div className="schemegrid schemegrid-head">
            <div className="center">SET</div>
            <div className="center">REPS</div>
            <div className="center">RIR</div>
            <div className="center">REST</div>
            <div />
          </div>
          {schemeOf(pe).map((ps, si) => (
            <div className="schemegrid" key={si} style={{ marginBottom: 6 }}>
              <div className="set-num">
                {si + 1}
                {ps.label && (
                  <div className="tag" style={{ fontSize: 8, lineHeight: 1.2 }}>
                    {ps.label.slice(0, 4)}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={ps.repMin || ''}
                  onChange={(e) =>
                    updateSetInScheme(pe, si, {
                      repMin: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                />
                <span className="faint">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={ps.repMax || ''}
                  onChange={(e) =>
                    updateSetInScheme(pe, si, {
                      repMax: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                />
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={ps.rir}
                onChange={(e) =>
                  updateSetInScheme(pe, si, { rir: Math.max(0, parseInt(e.target.value) || 0) })
                }
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={ps.restSec || ''}
                onChange={(e) =>
                  updateSetInScheme(pe, si, {
                    restSec: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
              <button
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={() => removeSetFromScheme(pe, si)}
                aria-label="Remove set"
                disabled={schemeOf(pe).length <= 1}
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn btn-sm btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => addSetToScheme(pe)}
          >
            <Icon name="plus" size={13} /> Add set
          </button>
          {schemeOf(pe)[0]?.tempo && (
            <div className="faint" style={{ fontSize: 11.5, marginTop: 8 }}>
              Tempo {schemeOf(pe)[0].tempo} (eccentric–pause–concentric–pause)
            </div>
          )}
        </div>
      ))}

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 12 }}
        onClick={() => setPickerOpen(true)}
      >
        <Icon name="plus" size={16} /> Add exercise to {currentDay.name}
      </button>

      <div className="spacer" />
      <button className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
        <Icon name="trash" size={16} /> Delete plan
      </button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(e) => addExercise(e.id)}
      />

      <SwapSheet
        exerciseId={
          swapPeId
            ? currentDay.exercises.find((x) => x.id === swapPeId)?.exerciseId ?? null
            : null
        }
        onClose={() => setSwapPeId(null)}
        onSwap={(id) => {
          if (swapPeId) updateExercise(swapPeId, { exerciseId: id })
        }}
      />

      {/* Edit meta sheet */}
      <Sheet open={editMeta} onClose={() => setEditMeta(false)} title="Plan details">
        <label className="eyebrow">Name</label>
        <input
          value={plan.name}
          onChange={(e) => save((d) => (d.name = e.target.value))}
          style={{ margin: '6px 0 14px' }}
        />
        <label className="eyebrow">Description</label>
        <textarea
          rows={3}
          value={plan.description ?? ''}
          onChange={(e) => save((d) => (d.description = e.target.value))}
          style={{ margin: '6px 0 14px', resize: 'vertical' }}
        />
        <button className="btn btn-primary btn-block" onClick={() => setEditMeta(false)}>
          Done
        </button>
        <div style={{ marginTop: 10 }}>
          <SharePlanButton plan={plan} />
        </div>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            setEditMeta(false)
            setConfirmRefresh(true)
          }}
        >
          <Icon name="swap" size={16} /> Refresh from template
        </button>
      </Sheet>

      <Sheet
        open={confirmRefresh}
        onClose={() => setConfirmRefresh(false)}
        title="Refresh from template?"
      >
        <p className="hint" style={{ marginTop: 0 }}>
          This replaces this plan's days and exercises with the current version of the built-in
          template — useful when the programming has been updated since you added it (for example
          to pick up per-set rep and RIR targets). Any edits you made to this plan will be lost.
          Your logged history and exercise notes are untouched.
        </p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            const ok = refreshFromTemplate(plan.id)
            setConfirmRefresh(false)
            if (!ok) alert('No matching built-in template found for this plan.')
          }}
        >
          Refresh now
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setConfirmRefresh(false)}
        >
          Cancel
        </button>
      </Sheet>

      {/* Confirm starting over an in-progress workout */}
      <Sheet
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        title="Workout in progress"
      >
        <p className="hint" style={{ marginTop: 0 }}>
          You already have a workout in progress. Starting this one will discard it and any sets
          you've logged.
        </p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            setConfirmStart(false)
            nav('/session')
          }}
        >
          <Icon name="play" size={16} /> Resume current workout
        </button>
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            startSession(plan, currentDay)
            setConfirmStart(false)
            nav('/session')
          }}
        >
          Discard it & start this one
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 6 }}
          onClick={() => setConfirmStart(false)}
        >
          Cancel
        </button>
      </Sheet>

      {/* Volume sheet — measured against MEV/MAV/MRV landmarks */}
      <Sheet open={showVolume} onClose={() => setShowVolume(false)} title="Weekly volume">
        <p className="hint" style={{ marginTop: 0 }}>
          Fractional weekly sets per muscle (a muscle worked as a secondary counts as half a set).
          Each bar is measured against that muscle's own landmarks — <strong>MEV</strong> (minimum
          effective) to <strong>MRV</strong> (maximum recoverable). These are calibrated starting
          points, not constants: start near MEV and ramp.
        </p>
        {weeklyVolume.length === 0 && <p className="faint">Add exercises to see volume.</p>}
        {weeklyVolume.map(([m, n]) => (
          <VolumeBar key={m} muscle={m} sets={n} detail />
        ))}
        <p className="hint" style={{ marginTop: 14, marginBottom: 0 }}>
          Volume is the strongest lever for growth, but with clear diminishing returns — and it's
          bounded by what you can recover from. Below MEV you likely won't grow; past MRV you
          outrun recovery. Ramp about {DEFAULTS.weeklySetRamp} set per muscle per week across a{' '}
          {DEFAULTS.mesocycleWeeks}-week block, then deload.
        </p>
      </Sheet>

      {/* Delete confirm */}
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this plan?">
        <p className="hint" style={{ marginTop: 0 }}>
          This can't be undone. Your logged workout history stays intact.
        </p>
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            deletePlan(plan.id)
            nav('/plans')
          }}
        >
          Delete "{plan.name}"
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setConfirmDelete(false)}
        >
          Cancel
        </button>
      </Sheet>
    </div>
  )
}

