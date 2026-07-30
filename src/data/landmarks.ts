import type { MuscleGroup } from '../types'

/**
 * Weekly volume landmarks (working sets) for an intermediate lifter, on the
 * FRACTIONAL counting scale this app uses (primary muscle = 1.0 set, secondary
 * = 0.5). Based on the Renaissance Periodization framework as summarized in the
 * project's evidence spec.
 *
 *  MV  = maintenance volume (keeps what you have)
 *  MEV = minimum effective volume (below this, expect little growth)
 *  MAV = maximum adaptive volume (the productive ramp zone)
 *  MRV = maximum recoverable volume (beyond this, you outrun recovery)
 *
 * These are calibrated STARTING POINTS, not constants — start at the low end
 * and adjust from your own recovery and performance.
 */
export interface VolumeLandmark {
  mv: [number, number]
  mev: [number, number]
  mav: [number, number]
  mrv: number
}

export const LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  Chest: { mv: [2, 4], mev: [4, 6], mav: [6, 16], mrv: 20 },
  Back: { mv: [6, 6], mev: [10, 10], mav: [14, 22], mrv: 25 },
  Traps: { mv: [0, 0], mev: [6, 8], mav: [12, 20], mrv: 26 },
  // The source table lists front / side / rear delts separately (MEV 6–8 / 8 /
  // 6–8, MRV 12–16 / 26 / 24–30). This app tracks one combined Shoulders
  // group, so the landmark is the sum of the three heads.
  Shoulders: { mv: [6, 12], mev: [20, 24], mav: [34, 54], mrv: 64 },
  Biceps: { mv: [6, 8], mev: [8, 10], mav: [14, 20], mrv: 26 },
  Triceps: { mv: [4, 6], mev: [6, 10], mav: [10, 14], mrv: 24 },
  Quads: { mv: [6, 8], mev: [8, 10], mav: [12, 18], mrv: 20 },
  Hamstrings: { mv: [3, 4], mev: [4, 6], mav: [10, 16], mrv: 20 },
  Glutes: { mv: [0, 0], mev: [4, 6], mav: [8, 16], mrv: 20 },
  Calves: { mv: [6, 8], mev: [8, 12], mav: [12, 16], mrv: 20 },
  Abs: { mv: [0, 0], mev: [6, 8], mav: [16, 20], mrv: 25 },
  Forearms: { mv: [2, 2], mev: [4, 6], mav: [8, 14], mrv: 25 },
  Shins: { mv: [0, 0], mev: [2, 4], mav: [6, 12], mrv: 16 },
}

export type VolumeZone = 'below-mev' | 'mev' | 'mav' | 'high' | 'above-mrv' | 'none'

/** Classify a weekly set count for a muscle against its landmarks. */
export function volumeZone(muscle: MuscleGroup, sets: number): VolumeZone {
  const l = LANDMARKS[muscle]
  if (!l || sets <= 0) return 'none'
  if (sets > l.mrv) return 'above-mrv'
  if (sets < l.mev[0]) return 'below-mev'
  if (sets <= l.mav[0]) return 'mev'
  // Past the productive ramp but still recoverable — worth naming, because
  // lumping it in with MAV hides that you are approaching your ceiling.
  if (sets > l.mav[1]) return 'high'
  return 'mav'
}

export const ZONE_LABEL: Record<VolumeZone, string> = {
  'below-mev': 'Below MEV',
  mev: 'Effective',
  mav: 'Productive',
  high: 'High',
  'above-mrv': 'Over MRV',
  none: '',
}

/** One-line reading of what the zone means, for the detail row. */
export const ZONE_HINT: Record<VolumeZone, string> = {
  'below-mev': 'below the threshold for growth',
  mev: 'enough to grow, with room to add',
  mav: 'in the productive range',
  high: 'near your recoverable ceiling',
  'above-mrv': 'past what you can recover from',
  none: '',
}

export const ZONE_COLOR: Record<VolumeZone, string> = {
  'below-mev': 'var(--zone-under)',
  mev: 'var(--accent)',
  mav: 'var(--zone-productive)',
  high: 'var(--zone-high)',
  'above-mrv': 'var(--zone-over)',
  none: 'var(--border-default)',
}

/**
 * Evidence-anchored programming defaults from the spec (§11.7). Used to seed
 * new plan exercises and shown in the Library reference.
 */
export const DEFAULTS = {
  compoundReps: [6, 10] as [number, number],
  isolationReps: [10, 15] as [number, number],
  compoundRir: [2, 3] as [number, number],
  isolationRirLastSet: [0, 2] as [number, number],
  compoundRestSec: 150,
  isolationRestSec: 90,
  eccentricTempoSec: [2, 3] as [number, number],
  mesocycleWeeks: 5, // 4 loading + 1 deload
  weeklySetRamp: 1,
  setsPerMuscleSessionCap: 10,
  proteinGPerKg: 1.6,
  proteinGPerKgDeficit: 2.2,
  frequencyPerMuscle: 2,
  defaultTempo: '2-0-1-0',
  stretchIsolationTempo: '3-1-1-0',
}
