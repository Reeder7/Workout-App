import type { Exercise, LoggedSet, MuscleGroup, Session, Unit } from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import { LANDMARKS } from '../data/landmarks'
import { e1rm, sessionVolume, weeklySetsByMuscle } from './stats'
import { progressionAdvice } from './progression'

/**
 * Build a compact, readable training report for review.
 *
 * The full JSON export is the backup format — complete, but far too large to
 * paste into a conversation from a phone. This is the other half: everything
 * needed to make programming decisions (what was lifted, how it moved, where
 * weekly volume lands against the landmarks) in a few hundred lines of text.
 *
 * Plain text on purpose — it survives copy/paste anywhere, unlike JSON, which
 * chat clients love to mangle.
 */

const DAY_MS = 24 * 60 * 60 * 1000

function ymd(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** A set as logged, e.g. "185×8@1" — weight × reps @ RIR. */
function setStr(st: { weight: number; reps: number; rir?: number }): string {
  const base = st.weight > 0 ? `${num(st.weight)}×${st.reps}` : `BW×${st.reps}`
  return st.rir != null ? `${base}@${st.rir}` : base
}

interface Exposure {
  date: number
  deload?: boolean
  sets: LoggedSet[]
  /** Heaviest set, breaking ties on reps — so bodyweight work ranks by reps. */
  best: { weight: number; reps: number }
  bestE1rm: number
}

/**
 * One entry per session in which the exercise was actually trained, oldest
 * first. Only completed sets count: a set left unticked is work that didn't
 * happen, and including it would overstate both volume and progress.
 */
function exposuresOf(sessions: Session[], exerciseId: string): Exposure[] {
  const out: Exposure[] = []
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex) continue
    const sets = ex.sets.filter((st) => st.done)
    if (sets.length === 0) continue
    let best = { weight: sets[0].weight, reps: sets[0].reps }
    let bestE1rm = 0
    for (const st of sets) {
      if (st.weight > best.weight || (st.weight === best.weight && st.reps > best.reps)) {
        best = { weight: st.weight, reps: st.reps }
      }
      bestE1rm = Math.max(bestE1rm, e1rm(st.weight, st.reps))
    }
    out.push({ date: s.date, deload: s.deload, sets, best, bestE1rm })
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface ReviewOptions {
  sessions: Session[]
  customExercises: Exercise[]
  unit: Unit
  /** How far back to report in detail. */
  days?: number
  now?: number
}

/**
 * Entries that are almost certainly mis-typed rather than remarkable.
 *
 * The common one by far is weight and reps entered into each other's field —
 * "10 × 135" for a 135 lb set of 10. That inflates the estimated 1RM enormously
 * and, worse, makes the next session look like a huge jump when it's simply the
 * first one typed correctly. Left unflagged, every trend built on top is wrong,
 * so the report says so instead of quietly reporting nonsense.
 */
function suspectReason(
  st: { weight: number; reps: number; rir?: number },
  timed: boolean,
): string | null {
  // Most specific first: one explanation per set, or the list becomes noise.
  if (!timed) {
    if (st.weight > 0 && st.weight <= 30 && st.reps >= 35) {
      return `looks like weight and reps are swapped — did you mean ${st.reps}×${st.weight}?`
    }
    if (st.reps > 50) return 'reps over 50'
  }
  if (st.reps === 0) return 'no reps recorded'
  if (st.rir != null && st.rir > 6) return `RIR ${st.rir} is outside 0–6`
  return null
}

/** True when the report has no training in it — nothing worth sending. */
export function isEmptyReport(report: string): boolean {
  return report.includes('nothing to review')
}

export function buildReviewReport(opts: ReviewOptions): string {
  const { sessions, customExercises, unit, days = 90, now = Date.now() } = opts
  const nameOf = (id: string) =>
    EXERCISE_BY_ID[id]?.name ?? customExercises.find((e) => e.id === id)?.name ?? id
  const metaOf = (id: string) =>
    EXERCISE_BY_ID[id] ?? customExercises.find((e) => e.id === id)

  // Only sessions with at least one completed set describe real training.
  const logged = sessions
    .filter((s) => s.exercises.some((e) => e.sets.some((st) => st.done)))
    .sort((a, b) => a.date - b.date)

  const out: string[] = []
  out.push('SPOTTER — TRAINING REVIEW')
  out.push(`Generated ${ymd(now)} · loads in ${unit}`)

  if (logged.length === 0) {
    out.push('')
    out.push('No completed sets logged yet — nothing to review.')
    return out.join('\n')
  }

  const first = logged[0].date
  const last = logged[logged.length - 1].date
  out.push(
    `${logged.length} workouts logged, ${ymd(first)} → ${ymd(last)} (${
      Math.round((last - first) / DAY_MS) + 1
    } days)`,
  )

  // ---------------------------------------------------------------- adherence
  out.push('')
  out.push('## FREQUENCY (last 6 weeks)')
  for (let w = 5; w >= 0; w--) {
    const end = now - w * 7 * DAY_MS
    const start = end - 7 * DAY_MS
    const inWeek = logged.filter((s) => s.date > start && s.date <= end)
    const sets = inWeek.reduce(
      (t, s) => t + s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0),
      0,
    )
    const vol = inWeek.reduce((t, s) => t + sessionVolume(s), 0)
    out.push(
      `  ${ymd(start + DAY_MS)}..${ymd(end)}  ${inWeek.length} sessions · ${sets} sets · ${num(
        Math.round(vol),
      )} ${unit} volume`,
    )
  }

  // ------------------------------------------------------- volume vs landmarks
  out.push('')
  out.push('## WEEKLY SETS BY MUSCLE (last 7 days, RIR-weighted vs landmarks)')
  const weekly = weeklySetsByMuscle(sessions, customExercises, 7, now)
  const muscles = Object.keys(LANDMARKS) as MuscleGroup[]
  for (const m of muscles) {
    const v = weekly[m] ?? 0
    const l = LANDMARKS[m]
    // Below MV is worse than below MEV, so it must not read as the quieter of
    // the two — both are flagged, and the untrained case is called out plainly.
    const zone =
      v <= 0
        ? 'NOT TRAINED'
        : v < l.mv[0]
          ? 'BELOW MV (not even maintaining)'
          : v < l.mev[0]
            ? 'BELOW MEV'
            : v < l.mav[0]
              ? 'effective'
              : v <= l.mrv
                ? 'productive'
                : 'OVER MRV'
    out.push(
      `  ${m.padEnd(11)} ${num(v).padStart(5)}  MEV ${l.mev[0]}-${l.mev[1]} · MAV ${
        l.mav[0]
      }-${l.mav[1]} · MRV ${l.mrv}  → ${zone}`,
    )
  }

  // ---------------------------------------------------------------- exercises
  const cutoff = now - days * DAY_MS
  const recent = logged.filter((s) => s.date >= cutoff)
  const ids = Array.from(
    new Set(recent.flatMap((s) => s.exercises.map((e) => e.exerciseId))),
  )

  out.push('')
  out.push(`## EXERCISES (${ids.length} trained in the last ${days} days)`)
  out.push('Per lift: sessions · first → latest top set · best e1RM · trend · engine verdict')

  const flagged: string[] = []
  const rows = ids
    .map((id) => ({ id, exp: exposuresOf(recent, id) }))
    .filter((r) => r.exp.length > 0)
    .sort((a, b) => b.exp[b.exp.length - 1].date - a.exp[a.exp.length - 1].date)

  for (const { id, exp } of rows) {
    const f = exp[0]
    const l = exp[exp.length - 1]
    // A lift loaded only by bodyweight has no meaningful e1RM — progress there
    // is reps, and reporting "0×0" would read as no data rather than no load.
    const bodyweight = exp.every((e) => e.best.weight === 0)
    // Timed holds put seconds in the reps field, and sled work is logged in
    // trips. An estimated 1RM from either is a meaningless number, and printing
    // one invites decisions based on it.
    const timed = exp.every((e) => e.sets.every((st) => st.target?.isHold))
    const noE1rm = timed || metaOf(id)?.excludeFromVolume === true
    const advice = progressionAdvice(metaOf(id), recent, unit)

    for (const e of exp) {
      for (const st of e.sets) {
        const why = suspectReason(st, timed)
        if (why) flagged.push(`  ${ymd(e.date)}  ${nameOf(id)}: ${setStr(st)} — ${why}`)
      }
    }

    out.push('')
    out.push(`### ${nameOf(id)}`)

    if (noE1rm) {
      const label = timed ? 'timed hold' : 'not load-progressed'
      out.push(
        `  ${exp.length} session${exp.length === 1 ? '' : 's'} · last ${ymd(
          l.date,
        )} · ${label} · no e1RM (${timed ? 'reps field holds seconds' : 'logged in trips/time'})`,
      )
      out.push(
        `  last: ${l.sets.map((st) => (timed ? `${st.reps}s` : setStr(st))).join(', ')}`,
      )
    } else if (bodyweight) {
      const d = l.best.reps - f.best.reps
      out.push(
        `  ${exp.length} session${exp.length === 1 ? '' : 's'} · last ${ymd(
          l.date,
        )} · bodyweight · ${
          exp.length < 2 ? 'first exposure' : `${d >= 0 ? '+' : ''}${d} reps on the top set`
        }`,
      )
      out.push(
        `  top set: BW×${f.best.reps} (${ymd(f.date)}) → BW×${l.best.reps} (${ymd(l.date)})`,
      )
    } else {
      const bestE1rm = Math.max(...exp.map((e) => e.bestE1rm))
      const d = l.bestE1rm - f.bestE1rm
      out.push(
        `  ${exp.length} session${exp.length === 1 ? '' : 's'} · last ${ymd(
          l.date,
        )} · best e1RM ${num(Math.round(bestE1rm))} ${unit} · ${
          exp.length < 2
            ? 'first exposure'
            : `${d >= 0 ? '+' : ''}${num(Math.round(d))} e1RM over ${exp.length} sessions`
        }`,
      )
      out.push(
        `  top set: ${num(f.best.weight)}×${f.best.reps} (${ymd(f.date)}) → ${num(
          l.best.weight,
        )}×${l.best.reps} (${ymd(l.date)})`,
      )
    }

    // The last three sessions in full — the detail progression decisions need.
    for (const e of exp.slice(-3)) {
      out.push(`  ${ymd(e.date)}: ${e.sets.map(setStr).join(', ')}${e.deload ? '  [deload]' : ''}`)
    }
    // The headline is useful even when the verdict is 'unknown' (which just
    // means the sets carried no prescribed target to judge against).
    if (advice.headline) {
      const label = advice.verdict === 'unknown' ? 'note' : advice.verdict
      out.push(`  engine: ${label} — ${advice.headline}`)
    }
  }

  if (flagged.length > 0) {
    out.push('')
    out.push(`## DATA CHECK — ${flagged.length} entr${flagged.length === 1 ? 'y' : 'ies'} look mis-typed`)
    out.push('Trends that include these are unreliable until they are corrected.')
    out.push(...flagged)
  }

  out.push('')
  out.push('(Sets read weight×reps@RIR. BW = bodyweight. e1RM is an estimate, not a tested max.)')
  return out.join('\n')
}
