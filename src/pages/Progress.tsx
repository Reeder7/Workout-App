import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import {
  personalRecords,
  summaryStats,
  weeklySetsByMuscle,
  sessionVolume,
  exerciseHistory,
} from '../lib/stats'
import { fmtNum, fmtWeight, relativeDate, fmtDuration } from '../lib/format'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'

export function Progress() {
  const nav = useNavigate()
  const sessions = useStore((s) => s.sessions)
  const custom = useStore((s) => s.customExercises)
  const unit = useStore((s) => s.settings.unit)
  const deleteSession = useStore((s) => s.deleteSession)
  const [openSession, setOpenSession] = useState<string | null>(null)

  const stats = summaryStats(sessions)
  const prs = useMemo(() => personalRecords(sessions), [sessions])
  const weekly = useMemo(() => weeklySetsByMuscle(sessions, custom), [sessions, custom])

  const name = (id: string) =>
    EXERCISE_BY_ID[id]?.name ?? custom.find((e) => e.id === id)?.name ?? 'Exercise'

  const trackedIds = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s) => s.exercises.forEach((e) => set.add(e.exerciseId)))
    return [...set]
  }, [sessions])

  const weeklyEntries = (Object.entries(weekly) as [string, number][]).sort(
    (a, b) => b[1] - a[1],
  )
  const maxWeekly = Math.max(1, ...weeklyEntries.map(([, n]) => n))

  const detail = sessions.find((s) => s.id === openSession)

  if (sessions.length === 0) {
    return (
      <div className="app">
        <div className="eyebrow">Analytics</div>
        <h1 className="page-title">Progress</h1>
        <div className="empty">
          <div className="empty-emoji">📈</div>
          <p>No data yet.</p>
          <p className="hint">
            Finish a workout and your PRs, volume, and per-lift trends show up here.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => nav('/')}>
            Start training
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="eyebrow">Analytics</div>
      <h1 className="page-title">Progress</h1>
      <p className="page-sub">Your lifts, tracked over time.</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.thisWeek}</div>
          <div className="stat-label">This week</div>
        </div>
        <div className="stat">
          <div className="stat-value">{fmtNum(stats.totalVolume / 1000)}k</div>
          <div className="stat-label">{unit} volume</div>
        </div>
      </div>

      {/* Weekly sets by muscle */}
      {weeklyEntries.length > 0 && (
        <>
          <div className="section-head">
            <h2>Sets this week</h2>
            <span className="tag">by muscle</span>
          </div>
          <div className="card">
            {weeklyEntries.map(([m, val]) => {
              const inRange = val >= 10
              return (
                <div key={m} style={{ marginBottom: 10 }}>
                  <div
                    className="row-between"
                    style={{ fontSize: 13, marginBottom: 4 }}
                  >
                    <span style={{ fontWeight: 600 }}>{m}</span>
                    <span className="mono muted">{val % 1 === 0 ? val : val.toFixed(1)}</span>
                  </div>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 4,
                      background: 'var(--surface-2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(val / maxWeekly) * 100}%`,
                        height: '100%',
                        background: inRange ? 'var(--accent)' : 'var(--accent-dim)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Personal records */}
      <div className="section-head">
        <h2>Personal records</h2>
        <span className="tag">est. 1RM</span>
      </div>
      {prs.slice(0, 8).map((pr) => (
        <button
          key={pr.exerciseId}
          className="card card-tap"
          style={{ width: '100%', textAlign: 'left', padding: '13px 16px' }}
          onClick={() => nav(`/progress/${pr.exerciseId}`)}
        >
          <div className="row-between">
            <div className="grow">
              <div style={{ fontWeight: 600 }} className="truncate">
                {name(pr.exerciseId)}
              </div>
              <div className="faint" style={{ fontSize: 12 }}>
                Best set {fmtWeight(pr.topWeight)} {unit} × {pr.repsAtTop} · {relativeDate(pr.date)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-value accent" style={{ fontSize: 18 }}>
                {fmtWeight(pr.bestE1rm)}
              </div>
              <div className="tag">{unit} 1RM</div>
            </div>
          </div>
        </button>
      ))}

      {/* Tracked lifts */}
      {trackedIds.length > 0 && (
        <>
          <div className="section-head">
            <h2>Tracked lifts</h2>
          </div>
          <div className="card">
            {trackedIds
              .map((id) => ({ id, pts: exerciseHistory(sessions, id) }))
              .sort((a, b) => b.pts.length - a.pts.length)
              .map(({ id, pts }) => (
                <button
                  key={id}
                  className="lrow"
                  style={{ width: '100%', textAlign: 'left', background: 'none' }}
                  onClick={() => nav(`/progress/${id}`)}
                >
                  <div className="grow">
                    <div style={{ fontWeight: 600 }} className="truncate">
                      {name(id)}
                    </div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {pts.length} session{pts.length === 1 ? '' : 's'} logged
                    </div>
                  </div>
                  <Icon name="chevron" className="faint" size={18} />
                </button>
              ))}
          </div>
        </>
      )}

      {/* History */}
      <div className="section-head">
        <h2>History</h2>
        <span className="tag">{sessions.length} total</span>
      </div>
      {sessions.map((s) => (
        <button
          key={s.id}
          className="card card-tap"
          style={{ width: '100%', textAlign: 'left', padding: '13px 16px' }}
          onClick={() => setOpenSession(s.id)}
        >
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
              <div className="tag">{unit} vol</div>
            </div>
          </div>
        </button>
      ))}

      <Sheet open={!!detail} onClose={() => setOpenSession(null)} title={detail?.name}>
        {detail && (
          <>
            <div className="faint" style={{ fontSize: 13, marginBottom: 14 }}>
              {relativeDate(detail.date)} · {fmtDuration(detail.durationSec)} ·{' '}
              {fmtNum(sessionVolume(detail))} {unit} volume
            </div>
            {detail.exercises.map((ex, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{name(ex.exerciseId)}</div>
                {ex.sets.map((st, j) => (
                  <div
                    key={j}
                    className="row"
                    style={{ fontSize: 13, gap: 8, color: 'var(--text-dim)' }}
                  >
                    <span className="faint" style={{ width: 20 }}>
                      {j + 1}
                    </span>
                    <span className="mono">
                      {fmtWeight(st.weight)} {unit} × {st.reps}
                      {st.rir != null ? ` @ ${st.rir} RIR` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <button
              className="btn btn-danger btn-block"
              style={{ marginTop: 8 }}
              onClick={() => {
                deleteSession(detail.id)
                setOpenSession(null)
              }}
            >
              <Icon name="trash" size={16} /> Delete this workout
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
