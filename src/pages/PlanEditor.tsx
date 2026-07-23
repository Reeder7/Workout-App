import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore, uid } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import type { MuscleGroup, Plan, PlanDay, PlanExercise } from '../types'

export function PlanEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const plan = useStore((s) => s.plans.find((p) => p.id === id))
  const allExercises = useStore((s) => s.allExercises())
  const updatePlan = useStore((s) => s.updatePlan)
  const deletePlan = useStore((s) => s.deletePlan)
  const startSession = useStore((s) => s.startSession)

  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editMeta, setEditMeta] = useState(false)

  const exName = (eid: string) =>
    EXERCISE_BY_ID[eid]?.name ?? allExercises.find((e) => e.id === eid)?.name ?? 'Exercise'

  const weeklyVolume = useMemo(() => {
    if (!plan) return [] as [MuscleGroup, number][]
    const counts = {} as Record<string, number>
    for (const d of plan.days) {
      for (const pe of d.exercises) {
        const meta = EXERCISE_BY_ID[pe.exerciseId] ?? allExercises.find((e) => e.id === pe.exerciseId)
        if (!meta) continue
        counts[meta.primary] = (counts[meta.primary] ?? 0) + pe.sets
        for (const sec of meta.secondary) counts[sec] = (counts[sec] ?? 0) + pe.sets * 0.5
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
    const [rMin, rMax] = meta?.repRange ?? [8, 12]
    const pe: PlanExercise = {
      id: uid('pe'),
      exerciseId,
      sets: 3,
      repMin: rMin,
      repMax: rMax,
      rir: 2,
      restSec: meta?.category === 'Compound' ? 150 : 60,
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
              startSession(plan, currentDay)
              nav('/session')
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
          style={{ fontWeight: 700, fontSize: 16 }}
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
              <div style={{ fontWeight: 700 }}>{exName(pe.exerciseId)}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {EXERCISE_BY_ID[pe.exerciseId]?.primary ?? 'Custom'}
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
              onClick={() => removeExercise(pe.id)}
              aria-label="Remove"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>

          <div className="grid-2" style={{ gap: 10 }}>
            <Field label="Sets">
              <input
                type="number"
                inputMode="numeric"
                value={pe.sets || ''}
                onChange={(e) => updateExercise(pe.id, { sets: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Target RIR">
              <input
                type="number"
                inputMode="numeric"
                value={pe.rir}
                onChange={(e) => updateExercise(pe.id, { rir: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <div className="grid-2" style={{ gap: 10, marginTop: 10 }}>
            <Field label="Reps (min–max)">
              <div className="row" style={{ gap: 6 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pe.repMin || ''}
                  onChange={(e) =>
                    updateExercise(pe.id, { repMin: parseInt(e.target.value) || 0 })
                  }
                />
                <span className="faint">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pe.repMax || ''}
                  onChange={(e) =>
                    updateExercise(pe.id, { repMax: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </Field>
            <Field label="Rest (sec)">
              <input
                type="number"
                inputMode="numeric"
                value={pe.restSec || ''}
                onChange={(e) =>
                  updateExercise(pe.id, { restSec: parseInt(e.target.value) || 0 })
                }
              />
            </Field>
          </div>
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
      </Sheet>

      {/* Volume sheet */}
      <Sheet open={showVolume} onClose={() => setShowVolume(false)} title="Weekly volume">
        <p className="hint" style={{ marginTop: 0 }}>
          Hard sets per muscle per week across all days (secondary muscles counted at half). A
          common hypertrophy target is roughly <strong>10–20 sets</strong> per muscle per week.
        </p>
        {weeklyVolume.length === 0 && <p className="faint">Add exercises to see volume.</p>}
        {weeklyVolume.map(([m, n]) => {
          const pct = Math.min(100, (n / 22) * 100)
          const inRange = n >= 10 && n <= 20
          return (
            <div key={m} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{m}</span>
                <span className="mono muted">
                  {n % 1 === 0 ? n : n.toFixed(1)} sets
                  {n < 10 && <span className="faint"> · low</span>}
                  {n > 20 && <span style={{ color: 'var(--danger)' }}> · high</span>}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: inRange ? 'var(--accent)' : 'var(--text-faint)',
                  }}
                />
              </div>
            </div>
          )
        })}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
