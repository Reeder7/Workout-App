import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { decodePlan } from '../lib/planShare'
import { Icon } from '../components/Icon'
import type { Plan } from '../types'

/**
 * Landing screen for a shared-program link. Decodes the plan from the URL,
 * previews it, and only writes it to the user's plans when they confirm.
 */
export function ImportPlan() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const addPlan = useStore((s) => s.addPlan)
  const allExercises = useStore((s) => s.allExercises())

  const [plan, setPlan] = useState<Plan | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'bad' | 'done'>('loading')

  const payload = params.get('d')

  useEffect(() => {
    let live = true
    if (!payload) {
      setState('bad')
      return
    }
    decodePlan(payload).then((p) => {
      if (!live) return
      if (p) {
        setPlan(p)
        setState('ready')
      } else {
        setState('bad')
      }
    })
    return () => {
      live = false
    }
  }, [payload])

  const exName = (id: string) =>
    EXERCISE_BY_ID[id]?.name ?? allExercises.find((e) => e.id === id)?.name ?? 'Exercise'

  const unknown = plan
    ? [
        ...new Set(
          plan.days
            .flatMap((d) => d.exercises.map((e) => e.exerciseId))
            .filter((id) => !EXERCISE_BY_ID[id] && !allExercises.some((e) => e.id === id)),
        ),
      ]
    : []

  if (state === 'loading') {
    return (
      <div className="app">
        <div className="empty" style={{ paddingTop: 60 }}>
          <p className="faint">Reading shared program…</p>
        </div>
      </div>
    )
  }

  if (state === 'bad') {
    return (
      <div className="app">
        <div className="empty" style={{ paddingTop: 60 }}>
          <div className="empty-glyph">
            <Icon name="share" size={38} />
          </div>
          <h1 className="page-title" style={{ fontSize: 22 }}>
            Couldn’t read that link
          </h1>
          <p className="hint">
            The share link looks incomplete — messaging apps sometimes cut long links in half. Ask
            for it again, and make sure the whole thing is copied.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => nav('/plans')}>
            Go to Plans
          </button>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="app">
        <div className="empty" style={{ paddingTop: 60 }}>
          <div className="empty-glyph">
            <Icon name="check" size={38} />
          </div>
          <h1 className="page-title" style={{ fontSize: 22 }}>
            Added to your plans
          </h1>
          <p className="hint">“{plan?.name}” is ready to train.</p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => nav('/')}>
            Go to Train
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => nav('/plans')}>
            View plans
          </button>
        </div>
      </div>
    )
  }

  const totalExercises = plan!.days.reduce((t, d) => t + d.exercises.length, 0)
  const totalSets = plan!.days.reduce(
    (t, d) => t + d.exercises.reduce((s, e) => s + (e.scheme?.length ?? e.sets), 0),
    0,
  )

  return (
    <div className="app">
      <div className="eyebrow">Shared program</div>
      <h1 className="page-title" style={{ fontSize: 26 }}>
        {plan!.name}
      </h1>
      <p className="page-sub">
        {plan!.days.length} day{plan!.days.length === 1 ? '' : 's'} · {totalExercises} exercises ·{' '}
        {totalSets} sets per week
      </p>

      {unknown.length > 0 && (
        <div className="caution-banner">
          <span className="caution-icon">⚠</span>
          <span className="hint" style={{ margin: 0 }}>
            {unknown.length} exercise{unknown.length === 1 ? '' : 's'} in this program aren’t in
            your library and will show as “Exercise”. You can swap them for something you do have
            after importing.
          </span>
        </div>
      )}

      {plan!.description && (
        <div className="card">
          <p className="hint" style={{ margin: 0, whiteSpace: 'pre-line' }}>
            {plan!.description}
          </p>
        </div>
      )}

      {plan!.days.map((d) => (
        <div className="card" key={d.id}>
          <div style={{ fontWeight: 640, marginBottom: 8 }}>{d.name}</div>
          {d.exercises.map((pe) => {
            const sets = pe.scheme?.length ?? pe.sets
            const first = pe.scheme?.[0]
            const reps = first
              ? first.repMin === first.repMax
                ? `${first.repMin}s hold`
                : `${first.repMin}–${first.repMax}`
              : `${pe.repMin}–${pe.repMax}`
            return (
              <div
                key={pe.id}
                className="row-between"
                style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-dim)' }}
              >
                <span className="truncate" style={{ marginRight: 10 }}>
                  {exName(pe.exerciseId)}
                </span>
                <span className="mono faint nowrap">
                  {sets} × {reps}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      <div className="spacer" />
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          addPlan(plan!)
          setState('done')
        }}
      >
        <Icon name="plus" size={18} /> Add to my plans
      </button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => nav('/plans')}>
        Cancel
      </button>
      <p className="faint center" style={{ fontSize: 11, marginTop: 14 }}>
        Importing copies the program onto this device. Your own workouts and notes aren’t affected.
      </p>
    </div>
  )
}
