import type { KneeCheckin, PrescribedSet, Swelling } from '../types'

/**
 * The knee check-in and the traffic light built on it. The program's rule is
 * pain ≤3/10 during a session and back to baseline by the next morning, with
 * swelling as the harder stop. This turns a morning check-in into that call.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Local calendar day as YYYY-MM-DD, so a check-in belongs to the day it was made. */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Midday of a YYYY-MM-DD day, for plotting and date maths away from DST edges. */
export function dayTime(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

export const SWELLING_LABEL: Record<Swelling, string> = {
  none: 'None',
  slight: 'Slight',
  obvious: 'Obvious',
}

export const SWELLING_HINT: Record<Swelling, string> = {
  none: 'Looks and feels like the other knee.',
  slight: 'A little puffy, or the dimples beside the kneecap are filled in.',
  obvious: 'Clearly bigger than the other knee, or tight when you bend it.',
}

export interface Baseline {
  pain: number
  stairs?: number
  /** How many check-ins it was taken from. */
  n: number
}

/** Check-ins needed before "your normal" means anything. */
export const BASELINE_MIN = 3

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

/**
 * Your normal: the median of the last seven check-ins before `day`, within the
 * last 14 days. A median rather than a mean so one bad morning doesn't move it.
 * Null until there are enough check-ins to trust.
 */
export function baselineFor(checkins: KneeCheckin[], day: string): Baseline | null {
  const cutoff = dayTime(day) - 14 * DAY_MS
  const prior = checkins
    .filter((c) => c.day < day && dayTime(c.day) >= cutoff)
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 7)
  if (prior.length < BASELINE_MIN) return null
  const stairs = prior.map((c) => c.stairs).filter((x): x is number => x != null)
  return {
    pain: median(prior.map((c) => c.pain)),
    stairs: stairs.length >= BASELINE_MIN ? median(stairs) : undefined,
    n: prior.length,
  }
}

export type KneeTone = 'good' | 'warn' | 'danger'

export interface KneeStatus {
  tone: KneeTone
  /** Short name for the light: Green / Yellow / Red. */
  light: string
  headline: string
  advice: string
  /** Why it landed where it did, e.g. "pain 2 above your normal". */
  reasons: string[]
}

/** How far above normal counts as a real change rather than noise. */
export const RISE = 2

export function kneeStatus(c: KneeCheckin, base: Baseline | null): KneeStatus {
  const reasons: string[] = []
  let danger = false
  let warn = false

  if (c.swelling === 'obvious') {
    danger = true
    reasons.push('obvious swelling')
  } else if (c.swelling === 'slight') {
    warn = true
    reasons.push('slight swelling')
  }

  if (c.pain >= 5) {
    danger = true
    reasons.push(`pain ${c.pain}/10`)
  } else if (base && c.pain >= base.pain + RISE) {
    warn = true
    reasons.push(`pain ${fmt(c.pain - base.pain)} above your normal`)
  } else if (!base && c.pain >= 3) {
    // No baseline yet: fall back to the program's own ceiling.
    warn = true
    reasons.push(`pain ${c.pain}/10`)
  }

  if (c.stairs != null) {
    if (c.stairs >= 7) {
      danger = true
      reasons.push(`stairs ${c.stairs}/10`)
    } else if (base?.stairs != null && c.stairs >= base.stairs + RISE) {
      warn = true
      reasons.push(`stairs ${fmt(c.stairs - base.stairs)} above your normal`)
    } else if (base?.stairs == null && c.stairs >= 4) {
      warn = true
      reasons.push(`stairs ${c.stairs}/10`)
    }
  }

  if (danger) {
    return {
      tone: 'danger',
      light: 'Red',
      headline: 'Skip the knee work today',
      advice:
        "Do an upper day or Saturday's session instead. If it starts a knee day anyway, step back is on. Swelling that is still there tomorrow means another easy day.",
      reasons,
    }
  }
  if (warn) {
    return {
      tone: 'warn',
      light: 'Yellow',
      headline: 'Step back a notch today',
      advice:
        'Train, but take the knee work down a step: one set fewer on leg exercises and each set a rep further from failure. Keep depth and box height where they were last week.',
      reasons,
    }
  }
  return {
    tone: 'good',
    light: 'Green',
    headline: 'Train as written',
    advice: base
      ? 'At or near your normal, with no swelling.'
      : `No swelling and low pain. Your normal is set once you have ${BASELINE_MIN} check-ins.`,
    reasons,
  }
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * Consecutive days, ending with the latest check-in, logged with no swelling.
 * A missed day doesn't reset it — only a day logged with swelling does. It is
 * the "no swelling for two weeks" half of the Phase 2 gate.
 */
export function daysWithoutSwelling(checkins: KneeCheckin[]): number {
  const sorted = [...checkins].sort((a, b) => (a.day < b.day ? 1 : -1))
  if (sorted.length === 0) return 0
  const lastSwelling = sorted.find((c) => c.swelling !== 'none')
  const latest = dayTime(sorted[0].day)
  if (!lastSwelling) {
    const first = dayTime(sorted[sorted.length - 1].day)
    return Math.round((latest - first) / DAY_MS) + 1
  }
  return Math.round((latest - dayTime(lastSwelling.day)) / DAY_MS)
}

/**
 * The step-back: one working set fewer on leg exercises (never below one), and
 * every working set a rep further from failure. Warm-ups and timed warm-up
 * slots are left alone — the joint still needs them, arguably more.
 */
export function stepBackScheme(scheme: PrescribedSet[]): PrescribedSet[] {
  const working = scheme.filter((ps) => !ps.warmup && ps.label !== 'Min')
  if (working.length === 0) return scheme
  const dropLast = working.length >= 2 ? working[working.length - 1] : null
  return scheme
    .filter((ps) => ps !== dropLast)
    .map((ps) =>
      ps.warmup || ps.label === 'Min' ? ps : { ...ps, rir: Math.min(5, ps.rir + 1) },
    )
}

/** Muscles whose exercises load the knee, for deciding what a step-back touches. */
export const KNEE_MUSCLES = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Shins'])
