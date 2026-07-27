import type { MuscleGroup, Session } from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import type { Exercise } from '../types'

/** Epley estimated 1-rep max. */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (t, ex) => t + ex.sets.reduce((s, st) => s + st.weight * st.reps, 0),
    0,
  )
}

export function sessionSetCount(session: Session): number {
  return session.exercises.reduce((t, ex) => t + ex.sets.length, 0)
}

export interface ExercisePoint {
  date: number
  bestE1rm: number
  topWeight: number
  volume: number
  reps: number
}

/** Time series for a single exercise across all sessions, oldest → newest. */
export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = []
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex || ex.sets.length === 0) continue
    let bestE1rm = 0
    let topWeight = 0
    let volume = 0
    let repsAtTop = 0
    for (const st of ex.sets) {
      const est = e1rm(st.weight, st.reps)
      if (est > bestE1rm) bestE1rm = est
      if (st.weight > topWeight) {
        topWeight = st.weight
        repsAtTop = st.reps
      }
      volume += st.weight * st.reps
    }
    points.push({ date: s.date, bestE1rm, topWeight, volume, reps: repsAtTop })
  }
  return points.sort((a, b) => a.date - b.date)
}

export interface PR {
  exerciseId: string
  bestE1rm: number
  topWeight: number
  repsAtTop: number
  date: number
}

export function personalRecords(sessions: Session[]): PR[] {
  const map = new Map<string, PR>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const st of ex.sets) {
        const est = e1rm(st.weight, st.reps)
        const cur = map.get(ex.exerciseId)
        if (!cur || est > cur.bestE1rm) {
          map.set(ex.exerciseId, {
            exerciseId: ex.exerciseId,
            bestE1rm: est,
            topWeight: st.weight,
            repsAtTop: st.reps,
            date: s.date,
          })
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.bestE1rm - a.bestE1rm)
}

function exerciseOf(id: string, custom: Exercise[]): Exercise | undefined {
  return EXERCISE_BY_ID[id] ?? custom.find((e) => e.id === id)
}

/** Hard sets per muscle group over the last `days` days (primary = 1, secondary = 0.5). */
export function weeklySetsByMuscle(
  sessions: Session[],
  custom: Exercise[],
  days = 7,
  now = Date.now(),
): Record<MuscleGroup, number> {
  const cutoff = now - days * 24 * 60 * 60 * 1000
  const counts = {} as Record<MuscleGroup, number>
  for (const s of sessions) {
    if (s.date < cutoff) continue
    for (const ex of s.exercises) {
      const meta = exerciseOf(ex.exerciseId, custom)
      if (!meta || meta.excludeFromVolume) continue
      const n = ex.sets.length
      counts[meta.primary] = (counts[meta.primary] ?? 0) + n
      for (const sec of meta.secondary) {
        counts[sec] = (counts[sec] ?? 0) + n * 0.5
      }
    }
  }
  return counts
}

export interface Streak {
  totalSessions: number
  thisWeek: number
  lastSession?: number
  totalVolume: number
}

export function summaryStats(sessions: Session[], now = Date.now()): Streak {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  return {
    totalSessions: sessions.length,
    thisWeek: sessions.filter((s) => s.date >= weekAgo).length,
    lastSession: sessions[0]?.date,
    totalVolume: sessions.reduce((t, s) => t + sessionVolume(s), 0),
  }
}
