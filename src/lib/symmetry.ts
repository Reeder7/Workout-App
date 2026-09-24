import type { LoggedExercise, LoggedSet, Session } from '../types'
import { e1rm } from './stats'

/**
 * Limb Symmetry Index: surgical-leg performance as a percentage of the other
 * leg. At or above 90% is the conventional benchmark for returning to running
 * and sport after ACL reconstruction, and below it the weaker side is still
 * being carried.
 */
export const LSI_TARGET = 90

/**
 * One side's strength on a set. Loaded work compares estimated 1RMs, so a
 * heavier weight for fewer reps still reads as stronger. Bodyweight work and
 * holds are logged with a token load (0 or 1), where reps or seconds are the
 * only honest comparison.
 */
function score(weight: number, reps: number, loaded: boolean): number {
  return loaded ? e1rm(weight, reps) : reps
}

export interface Symmetry {
  surgical: number
  good: number
  /** surgical ÷ good × 100 */
  lsi: number
  /** True when the comparison is by reps or seconds rather than load. */
  byReps: boolean
}

function hasGood(st: LoggedSet): st is LoggedSet & { good: { weight: number; reps: number } } {
  return !!st.good && st.good.reps > 0 && st.reps > 0
}

/**
 * Symmetry for one exercise within one session: best completed set on each
 * side. Null until both sides of at least one set have been logged.
 */
export function exposureSymmetry(ex: LoggedExercise): Symmetry | null {
  const pairs = ex.sets.filter((st) => st.done && hasGood(st)) as (LoggedSet & {
    good: { weight: number; reps: number }
  })[]
  if (pairs.length === 0) return null
  // Loaded only if both sides carry a real load; a token 1 lb band or
  // bodyweight entry compares by reps instead.
  const loaded = pairs.every((st) => st.weight > 1 && st.good.weight > 1)
  let surgical = 0
  let good = 0
  for (const st of pairs) {
    surgical = Math.max(surgical, score(st.weight, st.reps, loaded))
    good = Math.max(good, score(st.good.weight, st.good.reps, loaded))
  }
  if (good <= 0) return null
  return { surgical, good, lsi: (surgical / good) * 100, byReps: !loaded }
}

export interface SymmetryPoint extends Symmetry {
  date: number
  sessionId: string
}

/** Every session in which an exercise was logged per leg, oldest first. */
export function symmetryHistory(sessions: Session[], exerciseId: string): SymmetryPoint[] {
  const out: SymmetryPoint[] = []
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex) continue
    const sym = exposureSymmetry(ex)
    if (sym) out.push({ ...sym, date: s.date, sessionId: s.id })
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface SymmetrySummary {
  exerciseId: string
  latest: SymmetryPoint
  first: SymmetryPoint
  count: number
}

/** One row per exercise with per-leg data, weakest current symmetry first. */
export function symmetrySummary(sessions: Session[]): SymmetrySummary[] {
  const ids = new Set<string>()
  for (const s of sessions) for (const e of s.exercises) if (e.sets.some((st) => st.good)) ids.add(e.exerciseId)
  const rows: SymmetrySummary[] = []
  for (const id of ids) {
    const hist = symmetryHistory(sessions, id)
    if (hist.length === 0) continue
    rows.push({ exerciseId: id, latest: hist[hist.length - 1], first: hist[0], count: hist.length })
  }
  return rows.sort((a, b) => a.latest.lsi - b.latest.lsi)
}

export type SymmetryTone = 'good' | 'warn' | 'danger'

/** ≥90 on target, 80–90 closing, under 80 a real gap. */
export function lsiTone(lsi: number): SymmetryTone {
  if (lsi >= LSI_TARGET) return 'good'
  if (lsi >= 80) return 'warn'
  return 'danger'
}

export function fmtLsi(lsi: number): string {
  return `${Math.round(lsi)}%`
}
