import type { LoggedSet, Session } from '../types'

export type Target = NonNullable<LoggedSet['target']>

/** "8–12", or "20" when the range is a single value. */
export function repRangeText(t: Target): string {
  return t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`
}

/** Two prescriptions are the same programming, ignoring the label. */
function sameShape(a: Target, b: Target): boolean {
  return (
    a.repMin === b.repMin &&
    a.repMax === b.repMax &&
    a.rir === b.rir &&
    !!a.isHold === !!b.isHold &&
    a.tempo === b.tempo
  )
}

/** Same reps and tempo, differing only in RIR — an intensity ramp. */
function sameExceptRir(a: Target, b: Target): boolean {
  return (
    a.repMin === b.repMin &&
    a.repMax === b.repMax &&
    !!a.isHold === !!b.isHold &&
    a.tempo === b.tempo
  )
}

/**
 * Collapse a set list into one readable prescription line. Three sets of
 * 8–12 @ 2 RIR become "3 × 8–12 @ 2 RIR" instead of the same sentence
 * repeated above every row.
 */
export function describeScheme(sets: LoggedSet[]): string {
  const groups: { t: Target; n: number; label?: string }[] = []
  for (const s of sets) {
    if (!s.target) continue
    const prev = groups[groups.length - 1]
    if (prev && sameShape(prev.t, s.target)) {
      prev.n++
      prev.label = prev.label ?? s.target.label
    } else {
      groups.push({ t: s.target, n: 1, label: s.target.label })
    }
  }
  if (!groups.length) return ''

  /**
   * Second pass: a run of single sets at the same reps but stepping RIR is an
   * intensity ramp. "12–15 @ 2 RIR · 12–15 @ 1 RIR · 12–15 @ 0 RIR" is the
   * same instruction as "3 × 12–15 @ 2→0 RIR", and the templates use ramps
   * everywhere, so collapsing them matters.
   */
  const ramped: { t: Target; n: number; label?: string; rirTo?: number }[] = []
  for (const g of groups) {
    const prev = ramped[ramped.length - 1]
    const canRamp =
      prev &&
      g.n === 1 &&
      !g.label &&
      sameExceptRir(prev.t, g.t) &&
      (prev.rirTo ?? prev.t.rir) !== g.t.rir
    if (canRamp) {
      prev.n++
      prev.rirTo = g.t.rir
    } else {
      ramped.push({ ...g })
    }
  }

  const parts = ramped.map((g) => {
    const count = g.n > 1 ? `${g.n} × ` : ''
    const reps = repRangeText(g.t)
    const rir = g.rirTo != null ? `${g.t.rir}→${g.rirTo}` : `${g.t.rir}`
    // A "Hold" label already says it; don't render "Hold 2 × 30–45s hold".
    const suffix = g.t.isHold && !g.label ? 's hold' : 's'
    const body = g.t.isHold ? `${count}${reps}${suffix}` : `${count}${reps} @ ${rir} RIR`
    return g.label ? `${g.label} ${body}` : body
  })

  const tempo = ramped.find((g) => g.t.tempo)?.t.tempo
  if (tempo) parts.push(tempo)
  return parts.join(' · ')
}

/** True when every prescribed set is a timed hold, not a rep count. */
export function isHoldOnly(sets: LoggedSet[]): boolean {
  const targets = sets.map((s) => s.target).filter(Boolean) as Target[]
  return targets.length > 0 && targets.every((t) => t.isHold)
}

/**
 * The sets logged for this exercise the last time it was trained. Used to
 * ghost realistic starting numbers rather than a meaningless zero.
 */
export function lastLoggedSets(sessions: Session[], exerciseId: string): LoggedSet[] | null {
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.length) return ex.sets
  }
  return null
}

export interface Ghost {
  weight?: number
  reps?: number
  rir?: number
}

/**
 * What this set would be if you tapped the checkmark without typing: last
 * session's numbers at the same position, falling back to the prescription.
 */
export function ghostFor(last: LoggedSet[] | null, index: number, target?: Target): Ghost {
  const prior = last ? (last[index] ?? last[last.length - 1]) : undefined
  return {
    weight: prior?.weight || undefined,
    reps: prior?.reps || target?.repMin || undefined,
    rir: target?.rir,
  }
}
