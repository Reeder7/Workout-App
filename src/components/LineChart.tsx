import { useId, useRef, useState } from 'react'

export interface LinePoint {
  x: number // timestamp
  y: number
  label?: string
}

interface Props {
  points: LinePoint[]
  unit?: string
  height?: number
  format?: (y: number) => string
}

const W = 340
const PAD_L = 6
const PAD_R = 44 // room for the y-axis labels, which sit inside on the right
const PAD_T = 12
const PAD_B = 24

const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function LineChart({ points, unit = '', height = 190, format }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gradientId = useId()
  const [active, setActive] = useState<number | null>(null)
  const H = height

  if (points.length === 0) {
    return (
      <p className="faint center" style={{ padding: '30px 0' }}>
        No data yet.
      </p>
    )
  }

  const ys = points.map((p) => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeY = maxY - minY || Math.max(1, maxY * 0.1)
  const lo = minY - rangeY * 0.15
  const hi = maxY + rangeY * 0.15
  const spanY = hi - lo || 1

  const n = points.length
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const xAt = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (v: number) => PAD_T + plotH - ((v - lo) / spanY) * plotH

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`)
    .join(' ')
  const base = (H - PAD_B).toFixed(1)
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(1)},${base} L${xAt(0).toFixed(1)},${base} Z`

  const fmt = format ?? ((y: number) => `${Math.round(y)}`)

  // Label the actual data range rather than arbitrary fractions — the reader
  // wants to know what the top and bottom of this line mean.
  const ticks = n === 1 ? [maxY] : [maxY, minY + (maxY - minY) / 2, minY]

  function handleMove(clientX: number) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i) - relX)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    setActive(best)
  }

  const ap = active != null ? points[active] : null

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Trend across ${n} sessions, from ${fmt(points[0].y)}${unit} to ${fmt(
          points[n - 1].y,
        )}${unit}`}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setActive(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="var(--chart-grid)"
              strokeWidth="1"
            />
            <text
              x={W - PAD_R + 6}
              y={yAt(v) + 3.5}
              className="chart-axis"
              textAnchor="start"
            >
              {/* Axis labels read the scale, not an exact datum — round them. */}
              {fmt(Math.round(v))}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Every session as a dot, so sparse data doesn't look continuous. */}
        {n > 1 &&
          points.map((p, i) => (
            <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r="2.5" fill="var(--series-1)" />
          ))}
        <circle
          cx={xAt(n - 1)}
          cy={yAt(points[n - 1].y)}
          r="4.5"
          fill="var(--series-1)"
          stroke="var(--chart-surface)"
          strokeWidth="2"
        />

        {/* Date bookends */}
        <text x={PAD_L} y={H - 6} className="chart-axis" textAnchor="start">
          {shortDate(points[0].x)}
        </text>
        {n > 1 && (
          <text x={W - PAD_R} y={H - 6} className="chart-axis" textAnchor="end">
            {shortDate(points[n - 1].x)}
          </text>
        )}

        {ap && (
          <>
            <line
              x1={xAt(active!)}
              x2={xAt(active!)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--chart-baseline)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xAt(active!)}
              cy={yAt(ap.y)}
              r="5.5"
              fill="var(--series-1)"
              stroke="var(--chart-surface)"
              strokeWidth="2.5"
            />
          </>
        )}
      </svg>

      {ap && (
        <div
          className="chart-tip mono"
          style={{
            left: `${(xAt(active!) / W) * 100}%`,
            transform: `translateX(${
              active! === 0 ? '0' : active! === n - 1 ? '-100%' : '-50%'
            })`,
          }}
        >
          <strong>
            {fmt(ap.y)}
            {unit}
          </strong>
          {ap.label && <span className="chart-tip-sub"> · {ap.label}</span>}
        </div>
      )}
    </div>
  )
}
