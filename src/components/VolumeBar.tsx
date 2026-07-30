import { LANDMARKS, volumeZone, ZONE_COLOR, ZONE_HINT, ZONE_LABEL } from '../data/landmarks'
import type { MuscleGroup } from '../types'

interface Props {
  muscle: MuscleGroup
  sets: number
  /** Show the MEV/MAV/MRV numbers under the bar. */
  detail?: boolean
}

const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

/**
 * Weekly sets for one muscle, measured against that muscle's own landmarks
 * rather than against the other muscles. A single-hue fill states the zone;
 * MEV and MRV sit as ticks inside the track so the scale is legible without a
 * legend. Zone is always named in text as well as colour.
 */
export function VolumeBar({ muscle, sets, detail }: Props) {
  const l = LANDMARKS[muscle]
  if (!l) return null

  const zone = volumeZone(muscle, sets)
  // Headroom past MRV so an over-MRV bar reads as overshooting a limit rather
  // than as a full track.
  const scaleMax = l.mrv * 1.15
  const pct = Math.min(100, (sets / scaleMax) * 100)
  const at = (v: number) => Math.min(100, (v / scaleMax) * 100)
  const color = ZONE_COLOR[zone]

  return (
    <div className="vol">
      <div className="vol-head">
        <span className="vol-muscle">{muscle}</span>
        <span className="vol-count mono">{fmt(sets)}</span>
      </div>

      <div
        className="vol-track"
        role="meter"
        aria-valuenow={sets}
        aria-valuemin={0}
        aria-valuemax={l.mrv}
        aria-label={`${muscle}: ${fmt(sets)} weekly sets, ${ZONE_LABEL[zone]}`}
      >
        <div className="vol-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="vol-tick" style={{ left: `${at(l.mev[0])}%` }} aria-hidden="true" />
        <span
          className="vol-tick vol-tick-max"
          style={{ left: `${at(l.mrv)}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="vol-status">
        <span className="vol-dot" style={{ background: color }} aria-hidden="true" />
        <span className="vol-zone">{ZONE_LABEL[zone]}</span>
        <span className="vol-hint faint">— {ZONE_HINT[zone]}</span>
      </div>

      {detail && (
        <div className="vol-scale faint">
          MEV {l.mev[0]} · MAV {l.mav[0]}–{l.mav[1]} · MRV {l.mrv}
        </div>
      )}
    </div>
  )
}
