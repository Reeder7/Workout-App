import type { Plan, PlanDay, PlanExercise, PrescribedSet } from '../types'

let seq = 0

/** One prescribed set. */
function s(
  repMin: number,
  repMax: number,
  rir: number,
  restSec: number,
  extra: Partial<PrescribedSet> = {},
): PrescribedSet {
  return { repMin, repMax, rir, restSec, ...extra }
}

/**
 * Build a plan exercise from an explicit per-set scheme. The flat
 * sets/repMin/repMax/rir/restSec fields mirror set 1 so older UI and any
 * scheme-unaware code still reads something sensible.
 */
function mk(exerciseId: string, scheme: PrescribedSet[], role?: string): PlanExercise {
  const first = scheme[0]
  return {
    id: `tpl-${seq++}`,
    exerciseId,
    sets: scheme.length,
    repMin: first.repMin,
    repMax: first.repMax,
    rir: first.rir,
    restSec: first.restSec,
    scheme,
    role,
  }
}

/** Interpolate RIR from `from` down to `to` across `count` sets. */
function rirRamp(count: number, from: number, to: number): number[] {
  if (count <= 1) return [to]
  return Array.from({ length: count }, (_, i) =>
    Math.round(from + ((to - from) * i) / (count - 1)),
  )
}

interface Opts {
  rir?: [number, number]
  rest?: number
  tempo?: string
  role?: string
  /** Reps to use on the final set (e.g. a higher-rep back-off). */
  lastReps?: [number, number]
}

/**
 * Compound prescription: spec defaults are 6–10 reps, RIR 2–3, ~150 s rest.
 * RIR ramps down across sets so the last set is the hardest.
 */
function comp(
  exerciseId: string,
  count: number,
  reps: [number, number],
  o: Opts = {},
): PlanExercise {
  const [from, to] = o.rir ?? [3, 1]
  const rest = o.rest ?? 150
  const ramp = rirRamp(count, from, to)
  const scheme = ramp.map((rir, i) => {
    const r = i === count - 1 && o.lastReps ? o.lastReps : reps
    return s(r[0], r[1], rir, rest, o.tempo ? { tempo: o.tempo } : {})
  })
  return mk(exerciseId, scheme, o.role)
}

/**
 * Isolation prescription: spec defaults are 10–15 reps (8–20 range) with the
 * last set taken closest to failure (0–2 RIR), ~90 s rest.
 */
function iso(
  exerciseId: string,
  count: number,
  reps: [number, number],
  o: Opts = {},
): PlanExercise {
  const [from, to] = o.rir ?? [2, 0]
  const rest = o.rest ?? 90
  const ramp = rirRamp(count, from, to)
  const scheme = ramp.map((rir, i) => {
    const r = i === count - 1 && o.lastReps ? o.lastReps : reps
    return s(r[0], r[1], rir, rest, o.tempo ? { tempo: o.tempo } : {})
  })
  return mk(exerciseId, scheme, o.role)
}

/** A heavy top set followed by lighter, higher-rep back-off sets. */
function topSet(
  exerciseId: string,
  topReps: [number, number],
  backoffCount: number,
  backoffReps: [number, number],
  o: Opts = {},
): PlanExercise {
  const rest = o.rest ?? 180
  const scheme = [
    s(topReps[0], topReps[1], o.rir?.[0] ?? 1, rest, { label: 'Top set' }),
    ...Array.from({ length: backoffCount }, () =>
      s(backoffReps[0], backoffReps[1], o.rir?.[1] ?? 2, rest, { label: 'Back-off' }),
    ),
  ]
  return mk(exerciseId, scheme, o.role ?? 'Primary strength')
}

/** Timed isometric holds — reps fields carry seconds. */
function hold(
  exerciseId: string,
  count: number,
  seconds: [number, number],
  o: Opts = {},
): PlanExercise {
  const rest = o.rest ?? 120
  const scheme = Array.from({ length: count }, () =>
    s(seconds[0], seconds[1], 0, rest, { isHold: true, label: 'Hold' }),
  )
  return mk(exerciseId, scheme, o.role ?? 'Isometric primer')
}

function day(name: string, exercises: PlanExercise[]): PlanDay {
  return { id: `tpl-day-${seq++}`, name, exercises }
}

const STRETCH_TEMPO = '3-1-1-0'

/**
 * Built-in programs. Every exercise carries a real per-set prescription —
 * rep target, RIR, rest and (where useful) tempo for each individual set —
 * following the project's evidence spec: compounds ~5–10 reps at 2–3 RIR with
 * ~150 s rest, isolations ~8–20 reps with the last set closest to failure and
 * ~90 s rest, compounds ordered before isolations, and at least one
 * stretch-biased (long-muscle-length) movement per muscle.
 */
export const TEMPLATES: Plan[] = [
  // ---------------------------------------------------------------- 3-Day Full Body
  {
    id: 'tpl-full-body-3',
    name: 'Full Body — 3 Day',
    description:
      'Every muscle trained 3× per week at low per-session volume — strong frequency with almost no junk volume. Ideal for beginners or busy schedules. Focus on beating your logbook by a rep or a little load each session.',
    daysPerWeek: 3,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Full Body A', [
        comp('back-squat', 3, [6, 8], { rir: [3, 1], rest: 180, role: 'Primary squat' }),
        comp('bench-press', 3, [6, 8], { rir: [3, 1], rest: 180, role: 'Primary press' }),
        comp('chest-supported-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Horizontal pull' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('overhead-triceps-ext', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
      day('Full Body B', [
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('ohp', 3, [6, 8], { rir: [3, 1], rest: 150, role: 'Vertical press' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Vertical pull' }),
        comp('leg-press', 2, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('standing-calf-raise', 3, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
      day('Full Body C', [
        comp('hack-squat', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Quad-biased squat' }),
        comp('incline-db-press', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Upper chest' }),
        comp('seated-cable-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        iso('leg-extension', 2, [12, 20], { role: 'Quad isolation' }),
        iso('cable-crunch', 3, [10, 20], { role: 'Abs (loaded)' }),
      ]),
    ],
  },

  // ------------------------------------------------- Lean & Strong (balanced, 4-day)
  {
    id: 'tpl-lean-strong',
    name: 'Lean & Strong — 4 Day',
    description:
      'A balanced 4-day Upper/Lower for building shape while leaning out. Run it on a ROLLING schedule: if you only train 3 times some weeks, just pick up at the next day instead of always skipping the same one — everything still gets hit roughly 2× per week.\n\nThe look people call "toned" is muscle plus lower body fat. Leanness comes from the diet side; this plan\'s job is to build and keep the muscle that creates the shape — glutes, hamstrings, back and shoulders — while training everything else properly. Reps sit mostly in the 8–15 range with higher-rep 15–25 work on the small muscles: that builds just as well as very high reps and keeps sessions efficient. Training in this range will not make you bulky; noticeable muscle gain is slow and needs a deliberate calorie surplus.\n\nEASING BACK INTO LEGS: volume starts at the low end on purpose. For the first 1–2 weeks do one fewer set on each leg exercise, keep loads light enough that the last rep still feels controlled, and stop 2–3 reps short of failure. Some soreness in the first couple of weeks is normal; it fades fast. Add load or a rep once a session feels comfortably repeatable.\n\nEATING AT MAINTENANCE OR IN A SLIGHT DEFICIT: keep volume where it is rather than ramping it up — recovery is reduced when you under-eat. Aim for roughly 1.6–2.2 g of protein per kg of bodyweight, and treat holding or slowly improving your strength as the win. Nutrition is outside what this app tracks; this is general guidance, not a diet plan.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Lower A', [
        comp('leg-press', 3, [10, 15], { rir: [3, 2], rest: 150, role: 'Quads — stable start' }),
        comp('romanian-deadlift', 3, [8, 12], {
          rir: [3, 2],
          rest: 150,
          tempo: STRETCH_TEMPO,
          role: 'Hamstrings (stretch)',
        }),
        comp('hip-thrust', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Glutes' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (direct)' }),
        iso('hip-abduction', 2, [15, 25], { role: 'Glute medius' }),
        iso('standing-calf-raise', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Calves' }),
        iso('cable-crunch', 3, [10, 20], { role: 'Abs (loaded)' }),
      ]),
      day('Upper A', [
        comp('incline-db-press', 3, [8, 12], { rir: [3, 2], rest: 150, role: 'Upper chest' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        comp('chest-supported-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts — shoulder shape' }),
        iso('reverse-pec-deck', 2, [15, 20], { role: 'Rear delts / posture' }),
        iso('triceps-pushdown', 2, [12, 20], { role: 'Triceps' }),
        iso('ez-bar-curl', 2, [10, 15], { role: 'Biceps' }),
      ]),
      day('Lower B', [
        comp('heels-elevated-squat', 3, [8, 12], {
          rir: [3, 2],
          rest: 150,
          role: 'Quads — squat pattern',
        }),
        comp('bulgarian-split-squat', 3, [8, 12], {
          rir: [3, 2],
          rest: 120,
          role: 'Single leg — hold a rail',
        }),
        comp('back-extension-45', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Glutes/hamstrings' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('leg-extension', 2, [12, 20], { role: 'Quads (direct)' }),
        iso('seated-calf-raise', 3, [12, 20], { role: 'Calves — soleus' }),
        iso('cable-crunch', 3, [10, 20], { role: 'Abs (loaded)' }),
      ]),
      day('Upper B', [
        comp('machine-shoulder-press', 3, [8, 12], { rir: [3, 2], rest: 150, role: 'Shoulders' }),
        comp('seated-cable-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        comp('neutral-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        comp('machine-chest-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Chest' }),
        iso('lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('face-pull', 2, [15, 20], { role: 'Rear delts / rotators' }),
        iso('incline-db-curl', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 4-Day Upper/Lower
  {
    id: 'tpl-upper-lower',
    name: 'Upper / Lower — 4 Day',
    description:
      'The classic 4-day split: every muscle 2× per week with excellent volume distribution. One strength-leaning and one hypertrophy-leaning session per half — heavy top sets early in the week, higher-rep stretch-biased work later.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Upper (Strength)', [
        topSet('bench-press', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('barbell-row', 4, [6, 10], { rir: [3, 1], rest: 150, role: 'Horizontal pull' }),
        comp('ohp', 3, [6, 8], { rir: [2, 1], rest: 150, role: 'Vertical press' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Vertical pull' }),
        iso('cable-lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        iso('ez-bar-curl', 3, [8, 12], { role: 'Biceps' }),
        iso('triceps-pushdown', 3, [10, 15], { lastReps: [12, 20], role: 'Triceps' }),
      ]),
      day('Lower (Squat focus)', [
        topSet('back-squat', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('standing-calf-raise', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
        iso('hanging-leg-raise', 3, [8, 15], { role: 'Abs' }),
      ]),
      day('Upper (Hypertrophy)', [
        comp('incline-db-press', 4, [8, 12], { rir: [2, 1], rest: 150, role: 'Upper chest' }),
        comp('chest-supported-row', 4, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        comp('pullup', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Vertical pull' }),
        iso('incline-cable-fly', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Chest (stretch)' }),
        iso('cable-rear-delt-fly', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
      day('Lower (Hinge focus)', [
        topSet('romanian-deadlift', [5, 7], 2, [8, 10], { rir: [1, 2], rest: 210 }),
        comp('hack-squat', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Quad-biased squat' }),
        comp('bulgarian-split-squat', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Single-leg' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('leg-extension', 3, [12, 20], { role: 'Quad isolation' }),
        iso('seated-calf-raise', 4, [10, 20], { tempo: STRETCH_TEMPO, role: 'Soleus' }),
        iso('cable-crunch', 3, [10, 20], { role: 'Abs (loaded)' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 6-Day PPL
  {
    id: 'tpl-ppl',
    name: 'Push / Pull / Legs — 6 Day',
    description:
      'The classic 6-day intermediate–advanced split: each muscle 2× per week with room for full MAV-range volume and lots of exercise variety. Sessions run ~60–90 min. Demands good recovery.',
    daysPerWeek: 6,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push A', [
        comp('incline-barbell-press', 4, [6, 10], { rir: [3, 1], rest: 180, role: 'Upper chest' }),
        comp('flat-db-press', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Mid chest' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        iso('cable-lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
        iso('triceps-pushdown', 2, [12, 20], { role: 'Triceps lateral' }),
      ]),
      day('Pull A', [
        comp('barbell-row', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Horizontal pull' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        comp('seated-cable-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('db-pullover', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Lats (stretch)' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('hammer-curl', 2, [10, 15], { role: 'Brachialis' }),
      ]),
      day('Legs A', [
        topSet('back-squat', [5, 7], 2, [8, 10], { rir: [1, 2], rest: 210 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('standing-calf-raise', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
      day('Push B', [
        comp('ohp', 4, [5, 8], { rir: [3, 1], rest: 180, role: 'Vertical press' }),
        comp('machine-chest-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid chest' }),
        iso('high-low-cable-fly', 3, [12, 15], { tempo: STRETCH_TEMPO, role: 'Chest (stretch)' }),
        iso('lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        comp('close-grip-bench', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Triceps compound' }),
        iso('katana-extension', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
      day('Pull B', [
        comp('pullup', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Vertical pull' }),
        comp('chest-supported-row', 2, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('straight-arm-pulldown', 2, [12, 20], { tempo: STRETCH_TEMPO, role: 'Lats (isolation)' }),
        iso('cable-rear-delt-fly', 3, [12, 20], { role: 'Rear delts' }),
        iso('bayesian-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps long head' }),
        iso('barbell-shrug', 3, [10, 15], { role: 'Traps' }),
      ]),
      day('Legs B', [
        comp('hack-squat', 4, [8, 12], { rir: [3, 1], rest: 180, role: 'Quad-biased squat' }),
        comp('hip-thrust', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Glutes' }),
        comp('bulgarian-split-squat', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Single-leg' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('leg-extension', 3, [12, 20], { role: 'Quad isolation' }),
        iso('seated-calf-raise', 4, [10, 20], { tempo: STRETCH_TEMPO, role: 'Soleus' }),
      ]),
    ],
  },

  // ------------------------------------------------- PPL + Knee-Resilient legs
  {
    id: 'tpl-ppl-knee',
    // Bumped when the programming changes, so saved copies can offer an update:
    // 2 — three-set cap, direct calf work, wrist curls, spider curl,
    //     single-leg RDL in place of the barbell RDL, and ab work.
    // 3 — Push A, Pull A, Legs A and Push B rebuilt around what is actually
    //     being trained, checked against logged loads and the volume landmarks.
    revision: 3,
    name: 'Push · Pull · Legs (Knee-Resilient) — 6 Day',
    description:
      'A full 6-day Push/Pull/Legs where the leg days are knee-conscious: an isometric primer, quad AND hamstring priority, hip/glute work for valgus control, knee-friendly tempo and single-leg work, and low-impact sled finishers — no jumping or impact. Every exercise is capped at three working sets, and every one has its own set-by-set prescription. Load the legs pain-guided: keep knee pain ≤3/10 and settling by the next morning. Not medical advice — clear your loading with your PT/surgeon.',
    daysPerWeek: 6,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push A', [
        // Rebuilt around what's actually being trained and progressing. The
        // barbell bench and incline dumbbell press replaced the Smith incline
        // and flat dumbbell press: a heavy free-weight press plus a genuine
        // upper-chest press, rather than two machine presses.
        comp('bench-press', 3, [5, 8], { rir: [2, 1], rest: 210, role: 'Heavy press' }),
        comp('incline-db-press', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Upper chest' }),
        comp('machine-shoulder-press', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Front delts' }),
        iso('lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        // The only triceps isolation on this day, and deliberately the overhead
        // one. Nine heavy pressing sets already cover the lateral and medial
        // heads; the long head crosses the shoulder and is never stretched by
        // pressing, so overhead work is the one stimulus this day can't get for
        // free. Pushdown volume lives on Push B, where there's less pressing
        // fatigue to do it under.
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
        // Abs go on the push days: both leg days are already the longest
        // sessions, and trunk work there would compete with the hinge.
        // Seated, not the kneeling cable crunch — nothing on the knees.
        iso('machine-crunch', 3, [10, 15], { role: 'Abs (loaded flexion)' }),
      ]),
      day('Pull A', [
        comp('barbell-row', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Horizontal pull' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        // Widened from 10-12: the top set of the ramp lands around 8 reps, and a
        // range the work never enters just reads as a permanent miss.
        comp('seated-cable-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        // Preacher curl replaces the incline curl, matching what's actually
        // trained. It shortens the long head rather than stretching it, so the
        // week's long-head stretch work rests on the Bayesian curl in Pull B —
        // that slot is load-bearing, not optional.
        iso('preacher-curl', 3, [8, 12], { role: 'Biceps (short head)' }),
        iso('hammer-curl', 3, [10, 15], { role: 'Brachialis' }),
      ]),
      day('Legs A — Quad focus', [
        // Isometrics have a real analgesic effect on patellar tendon pain, so a
        // knee that feels better going into the squat is worth some fatigue.
        // The range is wide on purpose: ~45s is the sustained pain-relief hold,
        // ~75s is a genuine quad set. Both are useful; they aren't the same buy.
        hold('wall-sit', 3, [45, 75], { role: 'Isometric primer' }),
        // Eccentric stays slow — that is the knee-protective half. The three
        // second concentric came off: it caps the load without protecting
        // anything, and load is exactly what this lift has been missing.
        comp('heels-elevated-squat', 3, [8, 12], {
          rir: [3, 1],
          rest: 150,
          tempo: STRETCH_TEMPO,
          role: 'Primary quad (tempo)',
        }),
        // Ahead of the leg extension on purpose. Single-leg work needs balance
        // and control, so it goes while there is still some left; an isolation
        // machine is the right thing to do fatigued, and this is not that.
        iso('step-down', 3, [8, 12], { rir: [2, 1], rest: 90, role: 'Single-leg eccentric' }),
        // Run one leg at a time: reps are per leg, and each quad gets the full
        // three sets. Unilateral loading is what exposes a side-to-side gap,
        // which bilateral work hides — the deficit that persists after ACLR.
        iso('leg-extension', 3, [10, 15], { tempo: '3-0-1-0', role: 'Quad isolation (per leg)' }),
        iso('banded-lateral-walk', 2, [12, 20], { rir: [1, 0], rest: 60, role: 'Glute med / valgus' }),
        iso('standing-calf-raise', 3, [8, 15], {
          tempo: STRETCH_TEMPO,
          role: 'Gastrocnemius (knee straight)',
        }),
        mk(
          'backward-sled-drag',
          [
            s(3, 5, 1, 90, { label: 'Trip' }),
            s(3, 5, 1, 90, { label: 'Trip' }),
            s(3, 5, 0, 90, { label: 'Trip' }),
          ],
          'Low-impact capacity',
        ),
      ]),
      day('Push B', [
        comp('ohp', 3, [5, 8], { rir: [3, 1], rest: 180, role: 'Vertical press' }),
        comp('smith-incline-press', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Upper chest' }),
        iso('pec-deck', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Chest (stretch)' }),
        // Four sets, and the cable version gets them: constant tension holds the
        // side delt loaded at the bottom, where a dumbbell gives it nothing.
        // Shoulders are the one muscle sitting under its MAV band, and this is
        // the cheapest place to buy the volume back.
        iso('cable-lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        // Back to the skullcrusher after trying the JM press: the stretch was
        // the thing, and it was felt. Arced behind the head rather than lowered
        // to the forehead, this is the week's second long-head stretch exposure
        // — the JM press keeps the shoulder neutral and never lengthens it.
        iso('skullcrusher', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
        iso('triceps-pushdown', 3, [12, 20], { role: 'Triceps lateral' }),
        // The other half of the ab work, and a different job: curling the
        // pelvis under a long lever rather than loaded spinal flexion. Hanging,
        // so again no knee involvement.
        iso('hanging-leg-raise', 3, [8, 15], { role: 'Abs (pelvis curl)' }),
      ]),
      // Kept short deliberately — this was running 18-21 sets. Shrugs came out:
      // upper-trap work is the least of the priorities here, and it sat last in
      // a long session, which is why it was never once performed.
      day('Pull B', [
        comp('neutral-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Vertical pull' }),
        // Unilateral, unlike the chest-supported row it replaces — worth having
        // given how persistent side-to-side deficits are after ACLR.
        comp('meadows-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back (per side)' }),
        iso('straight-arm-pulldown', 2, [12, 20], { tempo: STRETCH_TEMPO, role: 'Lats (isolation)' }),
        iso('cable-rear-delt-fly', 3, [12, 20], { role: 'Rear delts' }),
        // Load-bearing slot: the week's only long-head biceps stretch, since the
        // preacher curl on Pull A shortens it instead. Don't drop this one.
        iso('bayesian-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps long head' }),
        // Paired with the Bayesian curl: shoulder flexed instead of extended, so
        // the short head does the work the long head just did.
        iso('spider-curl', 2, [10, 15], { role: 'Biceps short head' }),
        // Last slot on purpose: grip fatigue here can't compromise the pulls.
        // The roller winds up and unwinds, so it trains flexors and extensors in
        // one movement where a wrist curl only does flexion. Reps are full
        // up-and-down cycles.
        iso('wrist-roller', 2, [2, 5], { rest: 60, role: 'Forearms (both directions)' }),
      ]),
      day('Legs B — Posterior / Hip', [
        // Unilateral so the stronger leg can't carry the weaker one — reps are
        // per leg, so lighter and higher-rep than the barbell version.
        comp('single-leg-rdl', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Hip hinge (per leg)' }),
        // One leg at a time: extension ROM differs between the legs, so each
        // side works through the range it actually has.
        iso('seated-leg-curl', 3, [8, 15], {
          tempo: STRETCH_TEMPO,
          role: 'Hamstrings (stretch, per leg)',
        }),
        // Deliberately kept bilateral — the eccentric overload is the point and
        // a single-leg nordic is far past what one leg can control.
        iso('nordic-curl', 3, [3, 6], { rir: [2, 1], rest: 120, role: 'Eccentric hamstring' }),
        comp('hip-thrust', 3, [8, 15], { rir: [2, 1], rest: 120, role: 'Glutes' }),
        iso('back-extension-45', 3, [10, 15], { role: 'Posterior chain' }),
        iso('tke', 3, [12, 20], { rir: [1, 0], rest: 60, role: 'Quad activation' }),
        iso('seated-calf-raise', 3, [10, 20], {
          tempo: STRETCH_TEMPO,
          role: 'Soleus (knee bent)',
        }),
        iso('tibialis-raise', 3, [15, 25], { rir: [1, 0], rest: 45, role: 'Lower leg' }),
        mk(
          'sled-push',
          [
            s(3, 5, 1, 120, { label: 'Trip' }),
            s(3, 5, 1, 120, { label: 'Trip' }),
            s(3, 5, 0, 120, { label: 'Trip' }),
          ],
          'Low-impact capacity',
        ),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 5-Day ULPPL
  {
    id: 'tpl-ulppl',
    name: 'Upper·Lower·Push·Pull·Legs — 5 Day',
    description:
      'A popular 5-day hybrid: an Upper and Lower day anchor frequency, then Push / Pull / Legs add volume. Most muscles land ~2× per week with a strong recovery-to-volume ratio.',
    daysPerWeek: 5,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Upper', [
        topSet('bench-press', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('chest-supported-row', 4, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('ez-bar-curl', 3, [8, 12], { role: 'Biceps' }),
        iso('triceps-pushdown', 3, [10, 15], { lastReps: [12, 20], role: 'Triceps' }),
      ]),
      day('Lower', [
        topSet('back-squat', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('standing-calf-raise', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
        iso('cable-crunch', 3, [10, 20], { role: 'Abs (loaded)' }),
      ]),
      day('Push', [
        comp('incline-db-press', 4, [8, 12], { rir: [3, 1], rest: 150, role: 'Upper chest' }),
        comp('machine-chest-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid chest' }),
        iso('incline-cable-fly', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Chest (stretch)' }),
        iso('lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
      day('Pull', [
        comp('pullup', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Vertical pull' }),
        comp('seated-cable-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('db-pullover', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Lats (stretch)' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        iso('bayesian-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps long head' }),
        iso('hammer-curl', 2, [10, 15], { role: 'Brachialis' }),
      ]),
      day('Legs', [
        comp('hack-squat', 4, [8, 12], { rir: [3, 1], rest: 180, role: 'Quad-biased squat' }),
        comp('bulgarian-split-squat', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Single-leg' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('leg-extension', 3, [12, 20], { role: 'Quad isolation' }),
        iso('seated-calf-raise', 4, [10, 20], { tempo: STRETCH_TEMPO, role: 'Soleus' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 5-Day PPLUL
  {
    id: 'tpl-pplul',
    name: 'Push·Pull·Legs·Upper·Lower — 5 Day',
    description:
      'The other 5-day hybrid: front-load Push / Pull / Legs early in the week, then an Upper and Lower day to top frequency up to ~2× per muscle.',
    daysPerWeek: 5,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push', [
        topSet('bench-press', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        iso('high-low-cable-fly', 3, [12, 15], { tempo: STRETCH_TEMPO, role: 'Chest (stretch)' }),
        iso('cable-lateral-raise', 4, [12, 20], { role: 'Side delts' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
        iso('triceps-pushdown', 2, [12, 20], { role: 'Triceps lateral' }),
      ]),
      day('Pull', [
        comp('barbell-row', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Horizontal pull' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('hammer-curl', 2, [10, 15], { role: 'Brachialis' }),
        iso('barbell-shrug', 3, [10, 15], { role: 'Traps' }),
      ]),
      day('Legs', [
        topSet('back-squat', [5, 7], 2, [8, 10], { rir: [1, 2], rest: 210 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('standing-calf-raise', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
      day('Upper', [
        comp('incline-db-press', 4, [8, 12], { rir: [2, 1], rest: 150, role: 'Upper chest' }),
        comp('chest-supported-row', 4, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('machine-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('bayesian-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps long head' }),
        comp('close-grip-bench', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Triceps compound' }),
      ]),
      day('Lower', [
        comp('hack-squat', 4, [8, 12], { rir: [3, 1], rest: 180, role: 'Quad-biased squat' }),
        comp('bulgarian-split-squat', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Single-leg' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('leg-extension', 3, [12, 20], { role: 'Quad isolation' }),
        iso('seated-calf-raise', 4, [10, 20], { tempo: STRETCH_TEMPO, role: 'Soleus' }),
        iso('hanging-leg-raise', 3, [8, 15], { role: 'Abs' }),
      ]),
    ],
  },

  // ---------------------------------------------- 4-Day High-Frequency Full Body
  {
    id: 'tpl-hf-full-body',
    name: 'High-Frequency Full Body — 4 Day',
    description:
      'An advanced approach: 4 full-body sessions with most muscles trained 4× per week (1–2 exercises each per day). Each day opens with one heavy primary lift, then accessories. Recovery management is the priority.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Day 1 (Squat)', [
        topSet('back-squat', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('incline-db-press', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Upper chest' }),
        comp('chest-supported-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('seated-leg-curl', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('overhead-triceps-ext', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
      day('Day 2 (Bench)', [
        topSet('bench-press', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 210 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        iso('leg-extension', 2, [12, 20], { role: 'Quad isolation' }),
        iso('reverse-pec-deck', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 2, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
      ]),
      day('Day 3 (Hinge)', [
        topSet('romanian-deadlift', [5, 7], 2, [8, 10], { rir: [1, 2], rest: 210 }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        comp('seated-cable-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('triceps-pushdown', 2, [12, 20], { role: 'Triceps' }),
      ]),
      day('Day 4 (Overhead)', [
        topSet('ohp', [4, 6], 2, [6, 8], { rir: [1, 2], rest: 180 }),
        comp('hack-squat', 3, [8, 12], { rir: [2, 1], rest: 150, role: 'Quad-biased squat' }),
        comp('pullup', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Vertical pull' }),
        iso('lying-leg-curl', 2, [10, 15], { role: 'Hamstrings' }),
        iso('bayesian-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Biceps long head' }),
        iso('standing-calf-raise', 3, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- Powerbuilding
  {
    id: 'tpl-powerbuilding',
    name: 'Powerbuilding — 4 Day',
    description:
      'Strength and size together. Each session opens with a heavy low-rep top set and back-offs on a main lift, then bodybuilding accessories in moderate–high reps. Built on an Upper/Lower frame with the main lifts 2× per week.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Lower (Squat)', [
        topSet('back-squat', [3, 5], 3, [5, 6], { rir: [1, 2], rest: 240 }),
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('standing-calf-raise', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
      day('Upper (Bench)', [
        topSet('bench-press', [3, 5], 3, [5, 6], { rir: [1, 2], rest: 240 }),
        comp('barbell-row', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Horizontal pull' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('ez-bar-curl', 3, [8, 12], { role: 'Biceps' }),
      ]),
      day('Lower (Deadlift)', [
        topSet('deadlift', [3, 5], 2, [5, 6], { rir: [1, 2], rest: 240 }),
        comp('front-squat', 3, [6, 10], { rir: [2, 1], rest: 180, role: 'Quad compound' }),
        comp('bulgarian-split-squat', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Single-leg' }),
        iso('lying-leg-curl', 3, [10, 15], { role: 'Hamstrings' }),
        iso('seated-calf-raise', 4, [10, 20], { tempo: STRETCH_TEMPO, role: 'Soleus' }),
      ]),
      day('Upper (Press)', [
        topSet('ohp', [3, 5], 3, [5, 7], { rir: [1, 2], rest: 210 }),
        comp('close-grip-bench', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Triceps compound' }),
        comp('chest-supported-row', 4, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('cable-rear-delt-fly', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 2-Day Full Body
  {
    id: 'tpl-full-body-2',
    name: 'Full Body — 2 Day',
    description:
      'A minimalist plan for very busy weeks: two efficient full-body sessions covering every major movement pattern, each muscle 2× per week in as little time as possible.',
    daysPerWeek: 2,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Full Body A', [
        comp('back-squat', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Primary squat' }),
        comp('bench-press', 3, [6, 10], { rir: [3, 1], rest: 180, role: 'Primary press' }),
        comp('chest-supported-row', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Horizontal pull' }),
        iso('seated-leg-curl', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('standing-calf-raise', 3, [8, 15], { tempo: STRETCH_TEMPO, role: 'Gastrocnemius' }),
      ]),
      day('Full Body B', [
        comp('romanian-deadlift', 3, [8, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Vertical press' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Vertical pull' }),
        comp('leg-press', 3, [10, 15], { rir: [2, 1], rest: 120, role: 'Quad volume' }),
        iso('ez-bar-curl', 3, [8, 12], { role: 'Biceps' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
    ],
  },

  // ---------------------------------------------------------------- Knee-Resilient U/L
  {
    id: 'tpl-knee-resilient',
    name: 'Knee-Resilient Upper / Lower — 4 Day',
    description:
      'A knee-conscious 4-day split for training around chronic knee pain (e.g. post-ACL). Lower days start with an isometric primer, prioritize quads AND hamstrings, add hip/glute work for knee valgus control, use knee-friendly tempo and single-leg work, and finish with low-impact sled work — no jumping or impact. Load pain-guided: keep knee pain ≤3/10 during, settling to baseline by the next morning. Not medical advice — clear your loading with your surgeon/PT.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Lower A — Quad focus', [
        hold('wall-sit', 3, [30, 45], { role: 'Isometric primer' }),
        comp('heels-elevated-squat', 4, [8, 12], {
          rir: [3, 1],
          rest: 150,
          tempo: '3-1-3-0',
          role: 'Primary quad (tempo)',
        }),
        iso('leg-extension', 3, [10, 15], { tempo: '3-0-1-0', role: 'Quad isolation' }),
        iso('step-down', 3, [8, 12], { rir: [2, 1], rest: 90, role: 'Single-leg eccentric' }),
        iso('banded-lateral-walk', 2, [12, 20], { rir: [1, 0], rest: 60, role: 'Glute med / valgus' }),
        mk(
          'backward-sled-drag',
          [
            s(3, 5, 1, 90, { label: 'Trip' }),
            s(3, 5, 1, 90, { label: 'Trip' }),
            s(3, 5, 0, 90, { label: 'Trip' }),
          ],
          'Low-impact capacity',
        ),
      ]),
      day('Upper A', [
        comp('incline-db-press', 4, [8, 12], { rir: [2, 1], rest: 150, role: 'Upper chest' }),
        comp('chest-supported-row', 4, [8, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        comp('machine-shoulder-press', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Front delts' }),
        comp('lat-pulldown', 3, [8, 12], { rir: [2, 1], rest: 120, role: 'Lats' }),
        iso('cable-lateral-raise', 3, [12, 20], { role: 'Side delts' }),
        iso('ez-bar-curl', 3, [8, 12], { role: 'Biceps' }),
        iso('triceps-pushdown', 3, [10, 15], { lastReps: [12, 20], role: 'Triceps' }),
      ]),
      day('Lower B — Posterior / Hip', [
        comp('romanian-deadlift', 4, [6, 10], { rir: [3, 2], rest: 180, role: 'Hip hinge' }),
        iso('seated-leg-curl', 4, [8, 15], { tempo: STRETCH_TEMPO, role: 'Hamstrings (stretch)' }),
        iso('nordic-curl', 3, [3, 6], { rir: [2, 1], rest: 120, role: 'Eccentric hamstring' }),
        comp('hip-thrust', 3, [8, 15], { rir: [2, 1], rest: 120, role: 'Glutes' }),
        iso('back-extension-45', 3, [10, 15], { role: 'Posterior chain' }),
        iso('tke', 3, [12, 20], { rir: [1, 0], rest: 60, role: 'Quad activation' }),
        iso('tibialis-raise', 3, [15, 25], { rir: [1, 0], rest: 45, role: 'Lower leg' }),
        mk(
          'sled-push',
          [
            s(3, 5, 1, 120, { label: 'Trip' }),
            s(3, 5, 1, 120, { label: 'Trip' }),
            s(3, 5, 0, 120, { label: 'Trip' }),
          ],
          'Low-impact capacity',
        ),
      ]),
      day('Upper B', [
        comp('ohp', 4, [6, 10], { rir: [3, 1], rest: 150, role: 'Vertical press' }),
        comp('pullup', 3, [6, 10], { rir: [2, 1], rest: 150, role: 'Vertical pull' }),
        comp('seated-cable-row', 3, [10, 12], { rir: [2, 1], rest: 120, role: 'Mid-back' }),
        iso('db-pullover', 2, [10, 15], { tempo: STRETCH_TEMPO, role: 'Lats (stretch)' }),
        iso('cable-rear-delt-fly', 3, [12, 20], { role: 'Rear delts' }),
        iso('incline-db-curl', 3, [8, 12], { tempo: STRETCH_TEMPO, role: 'Biceps (stretch)' }),
        iso('overhead-triceps-ext', 3, [10, 15], { tempo: STRETCH_TEMPO, role: 'Triceps long head' }),
      ]),
    ],
  },
]

/**
 * The built-in template a saved plan came from. Matches on the recorded source
 * id, falling back to the name for plans saved before that link existed.
 */
export function sourceTemplateFor(plan: Plan): Plan | undefined {
  return (
    TEMPLATES.find((t) => t.id === plan.sourceTemplateId) ??
    TEMPLATES.find((t) => t.name === plan.name)
  )
}

/**
 * True when the source template's programming has been revised since this plan
 * was cloned or last refreshed. Compares recorded revisions rather than diffing
 * the days, so the user's own edits are never mistaken for an upstream change.
 */
export function templateUpdateAvailable(plan: Plan): boolean {
  const t = sourceTemplateFor(plan)
  if (!t?.revision) return false
  return (plan.sourceTemplateRevision ?? 0) < t.revision
}
