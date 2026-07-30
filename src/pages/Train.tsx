import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { summaryStats, sessionVolume } from '../lib/stats'
import { relativeDate, fmtDuration, fmtNum } from '../lib/format'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import type { Plan } from '../types'

export function Train() {
  const nav = useNavigate()
  const plans = useStore((s) => s.plans)
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.activeSession)
  const settings = useStore((s) => s.settings)
  const startSession = useStore((s) => s.startSession)
  const startEmpty = useStore((s) => s.startEmptySession)
  const deletePlan = useStore((s) => s.deletePlan)

  const [pickDayFor, setPickDayFor] = useState<Plan | null>(null)
  const [pendingStart, setPendingStart] = useState<
    { plan: Plan; dayId: string } | 'empty' | null
  >(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const stats = summaryStats(sessions)

  function doStart(target: { plan: Plan; dayId: string } | 'empty') {
    if (target === 'empty') {
      startEmpty()
    } else {
      const day = target.plan.days.find((d) => d.id === target.dayId)
      if (!day) return
      startSession(target.plan, day)
    }
    setPickDayFor(null)
    setPendingStart(null)
    nav('/session')
  }

  // Guard against silently discarding an in-progress workout.
  function requestStart(target: { plan: Plan; dayId: string } | 'empty') {
    if (active) {
      setPickDayFor(null)
      setPendingStart(target)
    } else {
      doStart(target)
    }
  }

  function begin(plan: Plan, dayId: string) {
    requestStart({ plan, dayId })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="app">
      <div className="eyebrow">{greeting}</div>
      <h1 className="page-title">Let's train.</h1>
      <p className="page-sub">
        {stats.totalSessions === 0
          ? 'Log your first workout to start building your history.'
          : `${stats.thisWeek} session${stats.thisWeek === 1 ? '' : 's'} this week · ${fmtNum(
              stats.totalVolume,
            )} ${settings.unit} lifted all-time`}
      </p>

      {active && (
        <button
          className="card card-tap"
          style={{
            width: '100%',
            textAlign: 'left',
            borderColor: 'var(--accent)',
            background: 'var(--accent-subtle)',
          }}
          onClick={() => nav('/session')}
        >
          <div className="row-between">
            <div>
              <div className="eyebrow accent">Workout in progress</div>
              <div style={{ fontSize: 18, fontWeight: 640, marginTop: 4 }}>{active.name}</div>
              <div className="faint" style={{ fontSize: 13 }}>
                {active.exercises.length} exercises · tap to resume
              </div>
            </div>
            <Icon name="play" className="accent" size={28} />
          </div>
        </button>
      )}

      <div className="section-head">
        <h2>Start a workout</h2>
      </div>

      {plans.length === 0 ? (
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            You don't have any plans yet. Build one from a proven template or from scratch.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => nav('/plans')}>
            <Icon name="plus" size={18} /> Create a plan
          </button>
        </div>
      ) : (
        plans.map((p) => (
          <div className="card" key={p.id}>
            <div className="row-between">
              <button
                className="grow"
                style={{ textAlign: 'left', background: 'none' }}
                onClick={() => setPickDayFor(p)}
              >
                <div style={{ fontWeight: 640, fontSize: 16 }}>{p.name}</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {p.days.length} day{p.days.length === 1 ? '' : 's'} · {p.daysPerWeek}×/week ·
                  tap to start
                </div>
              </button>
              <button
                className="icon-btn"
                onClick={() => nav(`/plans/${p.id}`)}
                aria-label="Edit plan"
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                className="icon-btn"
                onClick={() => setConfirmDelete({ id: p.id, name: p.name })}
                aria-label="Delete plan"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))
      )}

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 12 }}
        onClick={() => requestStart('empty')}
      >
        <Icon name="play" size={16} /> Quick / empty workout
      </button>

      {sessions.length > 0 && (
        <>
          <div className="section-head">
            <h2>Recent</h2>
            <button className="tag" onClick={() => nav('/progress')}>
              View all
            </button>
          </div>
          {sessions.slice(0, 5).map((s) => (
            <div key={s.id} className="card" style={{ padding: '14px 16px' }}>
              <div className="row-between">
                <div className="grow">
                  <div style={{ fontWeight: 600 }} className="truncate">
                    {s.name}
                  </div>
                  <div className="faint" style={{ fontSize: 12 }}>
                    {relativeDate(s.date)} · {s.exercises.length} exercises ·{' '}
                    {fmtDuration(s.durationSec)}
                  </div>
                </div>
                <div className="mono muted" style={{ fontSize: 13, textAlign: 'right' }}>
                  {fmtNum(sessionVolume(s))}
                  <div className="tag">{settings.unit} vol</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <Sheet
        open={!!pickDayFor}
        onClose={() => setPickDayFor(null)}
        title={pickDayFor?.name}
      >
        <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
          Pick today's session:
        </div>
        {pickDayFor?.days.map((d) => (
          <button
            key={d.id}
            className="lrow"
            style={{ width: '100%', textAlign: 'left', background: 'none' }}
            onClick={() => begin(pickDayFor, d.id)}
          >
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div className="faint truncate" style={{ fontSize: 12 }}>
                {d.exercises
                  .map((e) => EXERCISE_BY_ID[e.exerciseId]?.name ?? 'Exercise')
                  .slice(0, 3)
                  .join(', ')}
                {d.exercises.length > 3 ? '…' : ''}
              </div>
            </div>
            <Icon name="play" className="accent" size={20} />
          </button>
        ))}
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-ghost grow"
            onClick={() => {
              const id = pickDayFor?.id
              setPickDayFor(null)
              if (id) nav(`/plans/${id}`)
            }}
          >
            <Icon name="edit" size={16} /> Edit plan
          </button>
          <button
            className="btn btn-danger grow"
            onClick={() => {
              if (pickDayFor) setConfirmDelete({ id: pickDayFor.id, name: pickDayFor.name })
              setPickDayFor(null)
            }}
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
      </Sheet>

      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this plan?"
      >
        <p className="hint" style={{ marginTop: 0 }}>
          “{confirmDelete?.name}” will be removed from your plans. Your logged workout history and
          exercise notes are not affected.
        </p>
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirmDelete) deletePlan(confirmDelete.id)
            setConfirmDelete(null)
          }}
        >
          <Icon name="trash" size={16} /> Delete plan
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setConfirmDelete(null)}
        >
          Cancel
        </button>
      </Sheet>

      <Sheet
        open={!!pendingStart}
        onClose={() => setPendingStart(null)}
        title="Workout in progress"
      >
        <p className="hint" style={{ marginTop: 0 }}>
          You already have a workout in progress. Starting a new one will discard it and any
          sets you've logged.
        </p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            setPendingStart(null)
            nav('/session')
          }}
        >
          <Icon name="play" size={16} /> Resume current workout
        </button>
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: 10 }}
          onClick={() => pendingStart && doStart(pendingStart)}
        >
          Discard it & start new
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 6 }}
          onClick={() => setPendingStart(null)}
        >
          Cancel
        </button>
      </Sheet>
    </div>
  )
}
