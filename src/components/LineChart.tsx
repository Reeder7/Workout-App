import { useRef, useState } from 'react'

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
const PAD_L = 8
const PAD_R = 12
const PAD_T = 14
const PAD_B = 22

export function LineChart({ points, unit = '', height = 180, format }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const H = height

  if (points.length === 0) {
    return <p className="faint center" style={{ padding: '30px 0' }}>No data yet.</p>
  }

  const ys = points.map((p) => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeY = maxY - minY || 1
  // pad the y-range a touch so the line isn't glued to the edges
  const lo = minY - rangeY * 0.12
  const hi = maxY + rangeY * 0.12
  const spanY = hi - lo || 1

  const n = points.length
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const xAt = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (v: number) => PAD_T + plotH - ((v - lo) / spanY) * plotH

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(1)},${(H - PAD_B).toFixed(
    1,
  )} L${xAt(0).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`

  const fmt = format ?? ((y: number) => `${Math.round(y)}`)

  // gridlines: 3 horizontal
  const gridVals = [lo + spanY * 0.15, lo + spanY * 0.5, lo + spanY * 0.85]

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
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setActive(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setActive(null)}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* recessive gridlines */}
        {gridVals.map((v, i) => (
          <line
            key={i}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill="url(#lc-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* endpoint marker */}
        <circle cx={xAt(n - 1)} cy={yAt(points[n - 1].y)} r="4" fill="var(--accent)" />

        {/* active crosshair */}
        {ap && (
          <>
            <line
              x1={xAt(active!)}
              x2={xAt(active!)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--text-faint)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xAt(active!)}
              cy={yAt(ap.y)}
              r="5"
              fill="var(--accent)"
              stroke="var(--bg)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* tooltip */}
      {ap && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${(xAt(active!) / W) * 100}%`,
            transform: 'translateX(-50%)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 8px',
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
          className="mono"
        >
          <strong className="accent">
            {fmt(ap.y)}
            {unit}
          </strong>
          {ap.label && <span className="faint"> · {ap.label}</span>}
        </div>
      )}
    </div>
  )
}
