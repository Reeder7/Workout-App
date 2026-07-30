import type { Equipment, Exercise, LoggedExercise, LoggedSet, Session } from '../types'
import { e1rm } from './stats'
import { DEFAULTS } from '../data/landmarks'

export type Verdict =
  | 'deload'
  | 'add-load'
  | 'add-reps'
  | 'hold'
  | 'stalled'
  | 'back-off'
  | 'first-time'
  | 'unknown'

export interface Advice {
  verdict: Verdict
  /** Imperative, fits on one line in the workout. */
  headline: string
  /** Why, in terms of what was actually logged. */
  reason: string
  /** Suggested working load for the next exposure, when there is one. */
  suggestedWeight?: number
  /** Suggested reps to aim for at that load. */
  suggestedReps?: number
  tone: 'good' | 'neutral' | 'warn'
}

/**
 * Smallest sensible load jump for the equipment. Barbells move in plate pairs,
 * dumbbells and most selectorised machines in fixed increments, and cables in
 * whatever the stack allows — 5 lb is the safe common denominator.
 */
export function loadStep(equipment: Equipment, unit: 'lb' | 'kg'): number {
  const lb = unit === 'lb'
  switch (equipment) {
    case 'Barbell':
    case 'Smith':
      return lb ? 5 : 2.5
    case 'Dumbbell':
      return lb ? 5 : 2
    case 'Machine':
    case 'Cable':
      return lb ? 5 : 2.5
    default:
      // Bodyweight, band, sled: load isn't the lever, reps or time are.
      return 0
  }
}

/** Round a suggestion to something you can actually load on the equipment. */
function roundToStep(weight: number, step: number): number {
  if (step <= 0) return weight
  return Math.round(weight / step) * step
}

/** Exposures of one exercise, oldest → newest, only those with logged sets. */
function exposures(sessions: Session[], exerciseId: string): { date: number; ex: LoggedExercise }[] {
  return sessions
    .flatMap((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
      return ex && ex.sets.length ? [{ date: s.date, ex }] : []
    })
    .sort((a, b) => a.date - b.date)
}

/** Best estimated 1RM in a single exposure. */
function topE1rm(ex: LoggedExercise): number {
  return ex.sets.reduce((best, st) => Math.max(best, e1rm(st.weight, st.reps)), 0)
}

/** The heaviest load used for a set of at least `minReps`. */
function workingWeight(sets: LoggedSet[]): number {
  return sets.reduce((w, st) => Math.max(w, st.weight), 0)
}

/**
 * Double progression, judged against what was actually logged.
 *
 * The rule: work up the prescribed rep range at a fixed load. Once every
 * working set reaches the top of the range at or below the target RIR, the load
 * goes up and reps reset to the bottom. Until then, the load holds and reps are
 * the thing that moves.
 *
 * A declining estimated 1RM across consecutive exposures is treated as a stall
 * rather than a cue to push, since adding load into a downward trend is how
 * people dig holes.
 */
export function progressionAdvice(
  exercise: Exercise | undefined,
  sessions: Session[],
  unit: 'lb' | 'kg',
  opts: { deload?: boolean } = {},
): Advice {
  if (!exercise) return { verdict: 'unknown', headline: '', reason: '', tone: 'neutral' }

  const hist = exposures(sessions, exercise.id)
  if (hist.length === 0) {
    return {
      verdict: 'first-time',
      headline: 'First time logging this',
      reason: 'Pick a load you can control for the top of the rep range, and note it.',
      tone: 'neutral',
    }
  }

  const last = hist[hist.length - 1]
  const sets = last.ex.sets
  const step = loadStep(exercise.equipment, unit)
  const weight = workingWeight(sets)

  // A deload outranks every progression verdict. Telling someone to add load in
  // the week whose whole purpose is shedding fatigue is worse than saying
  // nothing.
  if (opts.deload) {
    const lighter = roundToStep(weight * DEFAULTS.deloadLoadFactor, step)
    return {
      verdict: 'deload',
      headline:
        step > 0 && lighter > 0 && lighter < weight
          ? `Deload — drop to about ${lighter} ${unit}`
          : 'Deload — keep every set easy',
      reason: `Last worked at ${weight} ${unit}. Sets are already cut for this week; stay at least ${DEFAULTS.deloadRirFloor} reps shy of failure and let fatigue clear.`,
      suggestedWeight: step > 0 ? lighter : weight,
      tone: 'neutral',
    }
  }

  // Targets come from the prescription carried on the logged sets. Without one
  // there is no range to progress through, so fall back to reporting the trend.
  const target = sets.find((st) => st.target)?.target
  const isHold = !!target?.isHold

  // Stall check first: two consecutive drops in estimated 1RM outrank any
  // rep-based verdict.
  if (hist.length >= 3 && !isHold) {
    const [a, b, c] = hist.slice(-3).map(({ ex }) => topE1rm(ex))
    if (a > 0 && b < a && c < b) {
      return {
        verdict: 'stalled',
        headline: 'Trending down — back off',
        reason: `Estimated 1RM has fallen three exposures running (${Math.round(
          a,
        )} → ${Math.round(b)} → ${Math.round(c)}). Take a lighter week here, or swap the lift.`,
        tone: 'warn',
      }
    }
  }

  if (!target) {
    const prev = hist.length >= 2 ? topE1rm(hist[hist.length - 2].ex) : 0
    const now = topE1rm(last.ex)
    return {
      verdict: 'unknown',
      headline: `Last time: ${weight} ${unit} × ${Math.max(...sets.map((s) => s.reps))}`,
      reason:
        prev > 0 && now > 0
          ? `Estimated 1RM ${now >= prev ? 'up' : 'down'} on the previous session.`
          : 'No rep target on this exercise, so there is no range to progress through.',
      tone: 'neutral',
    }
  }

  if (isHold) {
    const best = Math.max(...sets.map((s) => s.reps))
    const atTop = best >= target.repMax
    return atTop
      ? {
          verdict: 'add-load',
          headline: `Add time or load — ${target.repMax}s reached`,
          reason: `You held ${best}s, the top of the ${target.repMin}–${target.repMax}s range. Add resistance, or extend the hold.`,
          suggestedReps: target.repMax + 5,
          tone: 'good',
        }
      : {
          verdict: 'add-reps',
          headline: `Work toward ${target.repMax}s`,
          reason: `Best hold last time was ${best}s against a ${target.repMin}–${target.repMax}s target.`,
          suggestedReps: Math.min(target.repMax, best + 5),
          tone: 'neutral',
        }
  }

  // Only sets at the working load count toward the decision — a lighter
  // back-off set hitting the top of the range isn't a reason to add weight.
  const working = sets.filter((st) => st.weight >= weight && st.reps > 0)
  const allAtTop = working.length > 0 && working.every((st) => st.reps >= target.repMax)
  const atOrBelowTargetRir = working.every((st) => (st.rir ?? target.rir) <= target.rir)
  const anyBelowFloor = working.some((st) => st.reps < target.repMin)
  const bestReps = Math.max(...working.map((st) => st.reps), 0)

  if (allAtTop && atOrBelowTargetRir) {
    const next = roundToStep(weight + step, step)
    return {
      verdict: 'add-load',
      headline: step > 0 ? `Add load — ${weight} → ${next} ${unit}` : 'Add reps or slow the tempo',
      reason:
        step > 0
          ? `Every working set hit ${target.repMax} reps at ${target.rir} RIR or better. Take the load up and reset to ${target.repMin}.`
          : `You topped the rep range at ${target.rir} RIR or better, and this lift has no load increment — add reps, slow the eccentric, or increase the range of motion.`,
      suggestedWeight: step > 0 ? next : weight,
      suggestedReps: step > 0 ? target.repMin : target.repMax + 2,
      tone: 'good',
    }
  }

  if (allAtTop && !atOrBelowTargetRir) {
    return {
      verdict: 'hold',
      headline: 'Same load — push closer to failure',
      reason: `You hit the top of the range but logged more in reserve than the ${target.rir} RIR target. Repeat ${weight} ${unit} and take it nearer failure.`,
      suggestedWeight: weight,
      suggestedReps: target.repMax,
      tone: 'neutral',
    }
  }

  if (anyBelowFloor) {
    return {
      verdict: 'back-off',
      headline: `Hold ${weight} ${unit} — reps fell short`,
      reason: `A working set came in under ${target.repMin} reps. Stay at this load until every set clears the bottom of the range.`,
      suggestedWeight: weight,
      suggestedReps: target.repMin,
      tone: 'warn',
    }
  }

  return {
    verdict: 'add-reps',
    headline: `Same load — chase ${bestReps + 1} reps`,
    reason: `Best set last time was ${bestReps} against a ${target.repMin}–${target.repMax} target. Add reps at ${weight} ${unit} before adding load.`,
    suggestedWeight: weight,
    suggestedReps: Math.min(target.repMax, bestReps + 1),
    tone: 'neutral',
  }
}
