import { useRef, useState } from 'react'
import type { Exercise, KneeCheckin, Session } from '../types'
import { KNEE_MUSCLES, SWELLING_LABEL, dayKey, dayTime } from '../lib/knee'

interface Props {
  checkins: KneeCheckin[]
  sessions: Session[]
  exerciseOf: (id: string) => Exercise | undefined
  days?: number
}

const W = 340
const H = 200
const PAD_L = 22
const PAD_R = 40 // room for the end-of-line labels
const PAD_T = 10
const PAD_B = 30 // date labels + session ticks
const DAY_MS = 24 * 60 * 60 * 1000

const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

/** A session that loaded the knee: any counted set on a leg exercise. */
export function isKneeSession(s: Session, exerciseOf: (id: string) => Exercise | undefined) {
  return s.exercises.some((e) => {
    const m = exerciseOf(e.exerciseId)
    return !!m && KNEE_MUSCLES.has(m.primary) && !m.excludeFromVolume
  })
}

/**
 * Morning pain and stairs pain over the last few weeks on one fixed 0–10 axis,
 * with swelling marked above and knee sessions marked below — so a morning
 * that flared can be traced to the session the day before.
 */
export function KneeTrend({ checkins, sessions, exerciseOf, days = 28 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<string | null>(null)

  const todayT = dayTime(dayKey())
  const windowStart = todayT - (days - 1) * DAY_MS
  const inRange = checkins
    .filter((c) => dayTime(c.day) >= windowStart)
    .sort((a, b) => (a.day < b.day ? -1 : 1))
  // With less than the full window of history, start at the first check-in
  // (but show at least two weeks) rather than leaving the left half empty.
  const startT =
    inRange.length > 0
      ? Math.max(windowStart, Math.min(dayTime(inRange[0].day), todayT - 13 * DAY_MS))
      : windowStart
  const span = Math.max(1, Math.round((todayT - startT) / DAY_MS))

  const kneeSessions = sessions.filter(
    (s) => s.date >= startT - DAY_MS / 2 && isKneeSession(s, exerciseOf),
  )

  if (inRange.length === 0) {
    return (
      <p className="faint center" style={{ padding: '24px 0' }}>
        No check-ins yet. Log one on the Train tab each morning and the trend shows here.
      </p>
    )
  }

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const xAt = (t: number) => PAD_L + ((t - startT) / (span * DAY_MS)) * plotW
  const dayW = plotW / span
  const yAt = (v: number) => PAD_T + plotH - (v / 10) * plotH

  const path = (pts: { t: number; v: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.t).toFixed(1)},${yAt(p.v).toFixed(1)}`)
      .join(' ')

  const painPts = inRange.map((c) => ({
    t: dayTime(c.day),
    v: c.pain,
    day: c.day,
  }))
  const stairPts = inRange
    .filter((c) => c.stairs != null)
    .map((c) => ({ t: dayTime(c.day), v: c.stairs as number, day: c.day }))

  // End labels, nudged apart when the two lines finish close together.
  const lastPain = painPts[painPts.length - 1]
  const lastStairs = stairPts[stairPts.length - 1]
  let painLabelY = yAt(lastPain.v)
  let stairsLabelY = lastStairs ? yAt(lastStairs.v) : 0
  if (lastStairs && Math.abs(painLabelY - stairsLabelY) < 11) {
    const mid = (painLabelY + stairsLabelY) / 2
    const painAbove = lastPain.v >= lastStairs.v
    painLabelY = mid + (painAbove ? -6 : 6)
    stairsLabelY = mid + (painAbove ? 6 : -6)
  }

  function handleMove(clientX: number) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W
    let best: string | null = null
    let bestD = Infinity
    for (const c of inRange) {
      const d = Math.abs(xAt(dayTime(c.day)) - relX)
      if (d < bestD) {
        bestD = d
        best = c.day
      }
    }
    setActive(best)
  }

  const activeC = active ? inRange.find((c) => c.day === active) : undefined
  // Knee sessions the day before explain a morning, so show those in the tip.
  const sessionsBefore = activeC
    ? kneeSessions.filter((s) => dayKey(s.date) === dayKey(dayTime(activeC.day) - DAY_MS))
    : []
  const tipX = activeC ? xAt(dayTime(activeC.day)) : 0

  const ticks = [0, 5, 10]
  const dateTicks = [startT, startT + Math.round(span / 2) * DAY_MS, todayT]

  return (
    <div>
      <div className="knee-legend" aria-hidden="true">
        <span>
          <i className="knee-swatch" /> Morning pain
        </span>
        <span>
          <i className="knee-swatch is-stairs" /> Stairs
        </span>
        <span>
          <i className="knee-swatch-band" /> Swelling day
        </span>
        <span>
          <i className="knee-swatch is-limit" /> 3 = session limit
        </span>
        <span>
          <i className="knee-swatch-tick" /> Leg session
        </span>
      </div>
      <div className="chart">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`Knee pain over the last ${span + 1} days. Latest morning pain ${lastPain.v} out of 10${
            lastStairs ? `, stairs ${lastStairs.v}` : ''
          }. A table follows.`}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerDown={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setActive(null)}
          style={{ touchAction: 'pan-y', display: 'block' }}
        >
          {/* Swelling days shade the whole column: a state of the day rather than a
            value, so it sits behind the lines instead of competing with them. */}
          {inRange
            .filter((c) => c.swelling !== 'none')
            .map((c) => (
              <rect
                key={`w${c.day}`}
                className={`knee-swell-${c.swelling}`}
                x={xAt(dayTime(c.day)) - Math.max(4, dayW / 2)}
                width={Math.max(8, dayW)}
                y={PAD_T}
                height={plotH}
                rx={2}
              />
            ))}
          {ticks.map((v) => (
            <g key={v}>
              <line className="knee-grid" x1={PAD_L} x2={W - PAD_R} y1={yAt(v)} y2={yAt(v)} />
              <text className="chart-axis" x={PAD_L - 6} y={yAt(v) + 3} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {/* The program's in-session ceiling, for reference. */}
          <line className="knee-limit" x1={PAD_L} x2={W - PAD_R} y1={yAt(3)} y2={yAt(3)} />

          {stairPts.length > 1 && (
            <path
              d={path(stairPts)}
              className="knee-series-2"
              fill="none"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {painPts.length > 1 && (
            <path
              d={path(painPts)}
              className="knee-series-1"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {stairPts.map((p) => (
            <circle key={`s${p.day}`} className="knee-dot-2" cx={xAt(p.t)} cy={yAt(p.v)} r={4} />
          ))}
          {painPts.map((p) => (
            <circle key={`p${p.day}`} className="knee-dot-1" cx={xAt(p.t)} cy={yAt(p.v)} r={4} />
          ))}

          {kneeSessions.map((s) => {
            const x = xAt(dayTime(dayKey(s.date)))
            return (
              <line
                key={s.id}
                className="knee-session-tick"
                x1={x}
                x2={x}
                y1={H - PAD_B + 3}
                y2={H - PAD_B + 10}
              />
            )
          })}

          {dateTicks.map((t, i) => (
            <text
              key={t}
              className="chart-axis"
              x={xAt(t)}
              y={H - 4}
              textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            >
              {i === 2 ? 'Today' : shortDate(t)}
            </text>
          ))}

          <text className="chart-axis" x={xAt(lastPain.t) + 8} y={painLabelY + 3}>
            Pain
          </text>
          {lastStairs && (
            <text className="chart-axis" x={xAt(lastStairs.t) + 8} y={stairsLabelY + 3}>
              Stairs
            </text>
          )}

          {activeC && <line className="knee-cross" x1={tipX} x2={tipX} y1={PAD_T} y2={H - PAD_B} />}
        </svg>
        {activeC && (
          <div
            className="chart-tip knee-tip"
            // Pinned to the corner away from the point, so it never covers it and
            // never runs off the card however wide the text gets.
            style={tipX > W / 2 ? { left: 0 } : { right: 0 }}
          >
            {shortDate(dayTime(activeC.day))} · pain {activeC.pain}
            {activeC.stairs != null ? ` · stairs ${activeC.stairs}` : ''}
            <span className="chart-tip-sub">
              {' '}
              · swelling {SWELLING_LABEL[activeC.swelling].toLowerCase()}
              {sessionsBefore.length > 0
                ? ` · day after ${sessionsBefore
                    .map((s) => `${dayName(s)}${s.kneePain != null ? ` (${s.kneePain}/10)` : ''}`)
                    .join(', ')}`
                : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** "Knee A — Quad angles & stairs" out of "Plan · Knee A — Quad angles & stairs". */
function dayName(s: Session): string {
  const part = s.name.split(' · ').pop() ?? s.name
  return part.split(' — ')[0]
}
