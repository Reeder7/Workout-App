import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { exerciseHistory } from '../lib/stats'
import { LineChart, type LinePoint } from '../components/LineChart'
import { Icon } from '../components/Icon'
import { fmtWeight, relativeDate } from '../lib/format'

type Metric = 'e1rm' | 'weight' | 'volume'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'e1rm', label: 'Est. 1RM' },
  { key: 'weight', label: 'Top set' },
  { key: 'volume', label: 'Volume' },
]

export function ExerciseDetail() {
  const { exerciseId } = useParams()
  const nav = useNavigate()
  const sessions = useStore((s) => s.sessions)
  const custom = useStore((s) => s.customExercises)
  const unit = useStore((s) => s.settings.unit)
  const [metric, setMetric] = useState<Metric>('e1rm')

  const meta =
    EXERCISE_BY_ID[exerciseId ?? ''] ?? custom.find((e) => e.id === exerciseId)
  const history = useMemo(
    () => exerciseHistory(sessions, exerciseId ?? ''),
    [sessions, exerciseId],
  )

  const points: LinePoint[] = history.map((p) => ({
    x: p.date,
    y: metric === 'e1rm' ? p.bestE1rm : metric === 'weight' ? p.topWeight : p.volume,
    label: relativeDate(p.date),
  }))

  const first = points[0]?.y ?? 0
  const last = points[points.length - 1]?.y ?? 0
  const change = first > 0 ? ((last - first) / first) * 100 : 0
  const best = Math.max(0, ...points.map((p) => p.y))

  return (
    <div className="app">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
      </div>

      <h1 className="page-title" style={{ fontSize: 24 }}>
        {meta?.name ?? 'Exercise'}
      </h1>
      <p className="page-sub">
        {meta ? `${meta.primary} · ${meta.equipment} · ${meta.category}` : ''}
      </p>

      {history.length === 0 ? (
        <div className="empty">
          <p className="faint">No sessions logged for this lift yet.</p>
        </div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 10 }}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`chip${metric === m.key ? ' active' : ''}`}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: 4 }}>
              <div>
                <div className="stat-value">
                  {fmtWeight(last)}
                  <span className="faint" style={{ fontSize: 14, fontWeight: 600 }}>
                    {' '}
                    {metric === 'volume' ? unit : metric === 'weight' ? unit : `${unit} 1RM`}
                  </span>
                </div>
                <div className="tag">latest</div>
              </div>
              {points.length > 1 && (
                <div
                  className="pill"
                  style={{
                    color: change >= 0 ? 'var(--accent)' : 'var(--danger)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                </div>
              )}
            </div>
            <LineChart
              points={points}
              unit=""
              format={(y) => fmtWeight(y)}
            />
          </div>

          <div className="stat-grid stat-grid-2" style={{ marginTop: 12 }}>
            <div className="stat">
              <div className="stat-value accent">{fmtWeight(best)}</div>
              <div className="stat-label">Best {metric === 'e1rm' ? '1RM' : metric}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{history.length}</div>
              <div className="stat-label">Sessions</div>
            </div>
          </div>
        </>
      )}

      {meta && (meta.notes || meta.howTo || meta.cues || meta.mistakes || meta.science) && (
        <>
          <div className="section-head">
            <h2>How to perform</h2>
          </div>
          <div className="card">
            {meta.notes && (
              <p className="hint" style={{ margin: '0 0 4px' }}>
                {meta.notes}
              </p>
            )}
            {meta.repRange && (
              <div className="pill pill-accent" style={{ margin: '8px 0 4px' }}>
                Target {meta.repRange[0]}–{meta.repRange[1]} reps
              </div>
            )}

            {meta.howTo && meta.howTo.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Execution
                </div>
                <ol className="steps">
                  {meta.howTo.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {meta.cues && meta.cues.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Key cues
                </div>
                {meta.cues.map((c, i) => (
                  <div className="bullet" key={i}>
                    <span className="bullet-dot accent">▸</span>
                    <span className="hint">{c}</span>
                  </div>
                ))}
              </div>
            )}

            {meta.mistakes && meta.mistakes.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Avoid
                </div>
                {meta.mistakes.map((m, i) => (
                  <div className="bullet" key={i}>
                    <span className="bullet-dot" style={{ color: 'var(--danger)' }}>
                      ✕
                    </span>
                    <span className="hint">{m}</span>
                  </div>
                ))}
              </div>
            )}

            {meta.science && (
              <div
                className="science"
                style={{ marginTop: 16 }}
              >
                <span className="eyebrow accent">Why it works</span>
                <p className="hint" style={{ margin: '6px 0 0' }}>
                  {meta.science}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
