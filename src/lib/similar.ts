import type { Exercise } from '../types'

/**
 * Rank plausible substitutes for an exercise, following the spec's substitution
 * logic: match the primary muscle first, then the movement's role (compound vs
 * isolation), then overlapping secondary muscles and a comparable rep range.
 * Equipment is deliberately NOT required to match — swapping a barbell lift for
 * a machine or Smith version is usually the whole point.
 */
export function similarExercises(
  target: Exercise,
  all: Exercise[],
  limit = 10,
): Exercise[] {
  const scored = all
    .filter((e) => e.id !== target.id)
    .map((e) => {
      let score = 0
      if (e.primary === target.primary) score += 100
      // A muscle that is secondary here but primary there (or vice versa) still
      // makes a reasonable stand-in.
      else if (target.secondary.includes(e.primary)) score += 40
      else if (e.secondary.includes(target.primary)) score += 40

      if (e.category === target.category) score += 25

      const sharedSecondary = e.secondary.filter((m) => target.secondary.includes(m)).length
      score += sharedSecondary * 8

      if (e.repRange && target.repRange) {
        const overlap =
          Math.min(e.repRange[1], target.repRange[1]) - Math.max(e.repRange[0], target.repRange[0])
        if (overlap >= 0) score += 10
      }

      // Prefer keeping any special character of the movement (stretch-biased,
      // knee-friendly, isometric, …).
      const sharedTags = (e.tags ?? []).filter((t) => (target.tags ?? []).includes(t)).length
      score += sharedTags * 6

      return { e, score }
    })
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))

  return scored.slice(0, limit).map((x) => x.e)
}
