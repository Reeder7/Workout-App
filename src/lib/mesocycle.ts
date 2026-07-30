import { DEFAULTS } from '../data/landmarks'
import type { Plan } from '../types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface BlockState {
  /** 1-based week within the block. */
  week: number
  totalWeeks: number
  /** The last week of the block is the deload. */
  isDeload: boolean
  /** Weeks left before the deload starts. 0 while deloading. */
  weeksToDeload: number
  /** True once the block has run past its last week. */
  isOverdue: boolean
  startedAt: number
}

/**
 * Where a plan sits in its current block. Derived from a single timestamp
 * rather than a stored counter, so it can't drift out of sync with the calendar
 * and needs no upkeep between sessions.
 */
export function blockState(plan: Plan, now = Date.now()): BlockState | null {
  if (!plan.blockStartedAt) return null
  const totalWeeks = plan.blockWeeks ?? DEFAULTS.mesocycleWeeks
  const elapsed = Math.max(0, now - plan.blockStartedAt)
  const rawWeek = Math.floor(elapsed / WEEK_MS) + 1
  const isOverdue = rawWeek > totalWeeks
  const week = Math.min(rawWeek, totalWeeks)
  return {
    week,
    totalWeeks,
    isDeload: week === totalWeeks,
    weeksToDeload: Math.max(0, totalWeeks - 1 - week),
    isOverdue,
    startedAt: plan.blockStartedAt,
  }
}

export interface DeloadGuidance {
  setsFactor: number
  loadFactor: number
  rirFloor: number
  summary: string
}

/**
 * A deload cuts volume hard and load lightly: the point is to shed fatigue
 * while keeping the movement pattern and most of the load, not to detrain.
 */
export const DELOAD: DeloadGuidance = {
  setsFactor: DEFAULTS.deloadVolumeFactor,
  loadFactor: DEFAULTS.deloadLoadFactor,
  rirFloor: DEFAULTS.deloadRirFloor,
  summary: `About half the sets, ~${Math.round(
    (1 - DEFAULTS.deloadLoadFactor) * 100,
  )}% off the load, and stop every set at least ${DEFAULTS.deloadRirFloor} reps shy of failure.`,
}

/**
 * Apply a deload to a prescribed scheme: roughly half the sets, and every set
 * held well clear of failure. Load is left alone because the app prescribes
 * reps and RIR but never weight — taking ~10% off the bar stays the lifter's
 * call, which is what DELOAD.summary tells them.
 */
export function deloadScheme<T extends { rir: number }>(scheme: T[]): T[] {
  const keep = Math.max(1, Math.round(scheme.length * DELOAD.setsFactor))
  return scheme.slice(0, keep).map((ps) => ({
    ...ps,
    rir: Math.max(ps.rir, DELOAD.rirFloor),
  }))
}
