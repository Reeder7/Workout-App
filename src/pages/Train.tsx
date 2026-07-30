import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { summaryStats, sessionVolume } from '../lib/stats'
import { relativeDate, fmtDuration, fmtNum } from '../lib/format'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { ProgressRing } from '../components/ProgressRing'
import { EmptyState } from '../components/EmptyState'
import { toast } from '../lib/toast'
import { blockState, DELOAD } from '../lib/mesocycle'
import { DEFAULTS } from '../data/landmarks'
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
  const startBlock = useStore((s) => s.startBlock)

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

  // Weekly target comes from the plan itself rather than a hardcoded number.
  const weekTarget = plans.length ? Math.max(...plans.map((p) => p.daysPerWeek)) : 4

  // Block status follows the plan you're actually running: the one with a live
  // block, else the only plan you have.
  const activePlan = plans.find((p) => p.blockStartedAt) ?? (plans.length === 1 ? plans[0] : undefined)
  const block = activePlan ? blockState(activePlan) : null

  return (
    <div className="app">
      <div className="eyebrow">{greeting}</div>
      <h1 className="page-title">{settings.name ? `Let's train, ${settings.name}.` : "Let's train."}</h1>
      <p className="page-sub">
        {stats.totalSessions === 0
          ? 'Log your first workout to start building your history.'
          : `${fmtNum(stats.totalVolume)} ${settings.unit} lifted across ${
              stats.totalSessions
            } workout${stats.totalSessions === 1 ? '' : 's'}`}
      </p>

      {/* Hero: the one thing you came here to do, plus this week at a glance. */}
      <div className="hero-wrap">
        {active ? (
          <button
            className="hero hero-active"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => nav('/session')}
          >
            <ProgressRing
              value={active.exercises.reduce(
                (t, ex) => t + ex.sets.filter((s) => s.done).length,
                0,
              )}
              max={Math.max(
                1,
                active.exercises.reduce((t, ex) => t + ex.sets.length, 0),
              )}
              caption="sets"
            />
            <div className="hero-copy">
              <div className="eyebrow accent">In progress</div>
              <div className="hero-title truncate">{active.name}</div>
              <div className="hero-sub">{active.exercises.length} exercises · tap to resume</div>
            </div>
            <Icon name="play" className="accent" size={26} />
          </button>
        ) : (
          <div className="hero hero-block">
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              <ProgressRing value={stats.thisWeek} max={weekTarget} caption="this wk" />
              <div className="hero-copy">
                <div className="hero-title">
                  {stats.thisWeek >= weekTarget
                    ? 'Week complete'
                    : `${weekTarget - stats.thisWeek} to go this week`}
                </div>
                <div className="hero-sub">
                  {stats.thisWeek} of {weekTarget} sessions logged
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block hero-cta"
              onClick={() => {
                if (plans.length === 1) setPickDayFor(plans[0])
                else if (plans.length === 0) nav('/plans')
                else document.getElementById('plan-list')?.scrollIntoView({ block: 'start' })
              }}
            >
              <Icon name="play" size={18} />
              {plans.length === 0 ? 'Create a plan' : 'Start a workout'}
            </button>
          </div>
        )}
      </div>

      {block && activePlan && (
        <div className={`block-strip${block.isDeload ? ' is-deload' : ''}`}>
          <div className="row-between" style={{ gap: 'var(--space-3)' }}>
            <div className="grow">
              <div className="block-week">
                {block.isDeload ? 'Deload week' : `Block week ${block.week} of ${block.totalWeeks}`}
              </div>
              <div className="block-sub">
                {block.isOverdue
                  ? 'This block has run past its deload — start a new one.'
                  : block.isDeload
                    ? DELOAD.summary
                    : block.weeksToDeload === 0
                      ? 'Deload next week. Push this one.'
                      : `Deload in ${block.weeksToDeload} week${
                          block.weeksToDeload === 1 ? '' : 's'
                        }. Add about ${DEFAULTS.weeklySetRamp} set per muscle from last week.`}
              </div>
            </div>
            {(block.isDeload || block.isOverdue) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  startBlock(activePlan.id)
                  toast('New block started', 'success')
                }}
              >
                New block
              </button>
            )}
          </div>
          <div className="block-pips" aria-hidden="true">
            {Array.from({ length: block.totalWeeks }, (_, i) => (
              <span
                key={i}
                className={`block-pip${i + 1 < block.week ? ' done' : ''}${
                  i + 1 === block.week ? ' now' : ''
                }${i + 1 === block.totalWeeks ? ' deload' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="section-head" id="plan-list">
        <h2>Your plans</h2>
        {plans.length > 0 && (
          <button className="section-link" onClick={() => nav('/plans')}>
            Templates <Icon name="chevron" size={14} />
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          glyph="plan"
          title="No plans yet"
          body="Build one from a proven template, or start from scratch."
        >
          <button className="btn btn-primary" onClick={() => nav('/plans')}>
            <Icon name="plus" size={18} /> Create a plan
          </button>
        </EmptyState>
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
            <button className="section-link" onClick={() => nav('/progress')}>
              View all <Icon name="chevron" size={14} />
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
            if (confirmDelete) {
              deletePlan(confirmDelete.id)
              toast('Plan deleted')
            }
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
