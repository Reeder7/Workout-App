import type { Plan, PlanDay, PlanExercise } from '../types'

let seq = 0
function px(
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  rir: number,
  restSec: number,
): PlanExercise {
  return { id: `tpl-${seq++}`, exerciseId, sets, repMin, repMax, rir, restSec }
}

function day(name: string, exercises: PlanExercise[]): PlanDay {
  return { id: `tpl-day-${seq++}`, name, exercises }
}

/**
 * Built-in programs modeled on Jeff Nippard–style evidence-based training:
 * ~10–20 hard sets per muscle per week, ~2× weekly frequency, most work at
 * 1–3 RIR (isolations closer to failure than heavy compounds), compounds
 * first then isolations, and stretch-biased exercise selection.
 */
export const TEMPLATES: Plan[] = [
  // ---------------------------------------------------------------- 3-Day Full Body
  {
    id: 'tpl-full-body-3',
    name: 'Full Body — 3 Day',
    description:
      'Every muscle trained 3× per week. Ideal for beginners or busy schedules — the highest bang-for-buck frequency when you can only train a few days. Focus on adding weight or reps each session.',
    daysPerWeek: 3,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Full Body A', [
        px('back-squat', 3, 6, 8, 2, 180),
        px('bench-press', 3, 6, 8, 2, 180),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('lateral-raise', 3, 12, 20, 1, 60),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
      ]),
      day('Full Body B', [
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('ohp', 3, 6, 8, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('leg-press', 3, 10, 15, 2, 120),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('standing-calf-raise', 3, 8, 15, 1, 60),
      ]),
      day('Full Body C', [
        px('hack-squat', 3, 8, 12, 2, 150),
        px('incline-db-press', 3, 8, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('leg-extension', 3, 12, 20, 1, 60),
        px('cable-crunch', 3, 10, 20, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 4-Day Upper/Lower
  {
    id: 'tpl-upper-lower',
    name: 'Upper / Lower — 4 Day',
    description:
      'The classic 4-day split — Nippard’s pick for time-limited intermediates. A strength-leaning and a hypertrophy-leaning day for each half; every muscle trained 2× per week.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Upper (Strength)', [
        px('bench-press', 4, 5, 8, 2, 180),
        px('barbell-row', 4, 6, 10, 2, 150),
        px('ohp', 3, 6, 10, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('ez-bar-curl', 3, 8, 12, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Lower (Squat focus)', [
        px('back-squat', 4, 5, 8, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 8, 15, 1, 60),
        px('hanging-leg-raise', 3, 8, 15, 1, 60),
      ]),
      day('Upper (Hypertrophy)', [
        px('incline-db-press', 4, 8, 12, 2, 120),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('pullup', 3, 6, 12, 2, 120),
        px('cable-rear-delt-fly', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 15, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
      ]),
      day('Lower (Deadlift focus)', [
        px('romanian-deadlift', 4, 6, 10, 2, 210),
        px('hack-squat', 3, 8, 12, 2, 150),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('seated-calf-raise', 4, 10, 20, 1, 60),
        px('cable-crunch', 3, 10, 20, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 6-Day PPL
  {
    id: 'tpl-ppl',
    name: 'Push / Pull / Legs — 6 Day',
    description:
      'High-volume 6-day split for dedicated intermediate–advanced lifters. Each muscle trained 2× per week with lots of exercise variety. Demands good recovery.',
    daysPerWeek: 6,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push A', [
        px('bench-press', 4, 6, 10, 2, 180),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('incline-db-press', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 4, 12, 20, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
        px('rope-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Pull A', [
        px('barbell-row', 4, 6, 10, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('hammer-curl', 3, 8, 15, 1, 60),
      ]),
      day('Legs A', [
        px('back-squat', 4, 6, 10, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 8, 15, 1, 60),
      ]),
      day('Push B', [
        px('ohp', 4, 6, 10, 2, 150),
        px('machine-chest-press', 3, 8, 12, 2, 120),
        px('high-low-cable-fly', 3, 12, 20, 1, 60),
        px('lateral-raise', 4, 12, 20, 1, 60),
        px('close-grip-bench', 3, 8, 12, 2, 120),
        px('skullcrusher', 3, 8, 12, 1, 90),
      ]),
      day('Pull B', [
        px('pullup', 4, 6, 12, 2, 120),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('straight-arm-pulldown', 3, 12, 20, 1, 60),
        px('cable-rear-delt-fly', 3, 12, 20, 1, 60),
        px('bayesian-curl', 3, 10, 15, 1, 60),
        px('barbell-shrug', 3, 10, 15, 1, 60),
      ]),
      day('Legs B', [
        px('hack-squat', 4, 8, 12, 2, 180),
        px('hip-thrust', 3, 8, 15, 2, 120),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('leg-extension', 3, 12, 20, 1, 60),
        px('seated-calf-raise', 4, 10, 20, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 5-Day ULPPL
  {
    id: 'tpl-ulppl',
    name: 'Upper·Lower·Push·Pull·Legs — 5 Day',
    description:
      'A popular 5-day hybrid: an Upper and Lower day to anchor frequency, then Push / Pull / Legs to add volume. Most muscles hit ~2× per week with a great recovery-to-volume ratio.',
    daysPerWeek: 5,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Upper', [
        px('bench-press', 4, 6, 10, 2, 180),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('ez-bar-curl', 3, 8, 12, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Lower', [
        px('back-squat', 4, 5, 8, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 8, 15, 1, 60),
        px('cable-crunch', 3, 10, 20, 1, 60),
      ]),
      day('Push', [
        px('incline-db-press', 4, 8, 12, 2, 120),
        px('machine-chest-press', 3, 8, 12, 2, 120),
        px('lateral-raise', 4, 12, 20, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
        px('rope-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Pull', [
        px('pullup', 4, 6, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('bayesian-curl', 3, 10, 15, 1, 60),
        px('hammer-curl', 3, 8, 15, 1, 60),
      ]),
      day('Legs', [
        px('hack-squat', 4, 8, 12, 2, 180),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('leg-extension', 3, 12, 20, 1, 60),
        px('seated-calf-raise', 4, 10, 20, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 5-Day PPLUL
  {
    id: 'tpl-pplul',
    name: 'Push·Pull·Legs·Upper·Lower — 5 Day',
    description:
      'The other 5-day hybrid: front-load Push / Pull / Legs early in the week, then an Upper and Lower day to top frequency up to ~2× per muscle. Great when you want dedicated PPL focus plus balance.',
    daysPerWeek: 5,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push', [
        px('bench-press', 4, 6, 10, 2, 180),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('high-low-cable-fly', 3, 12, 20, 1, 60),
        px('cable-lateral-raise', 4, 12, 20, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
        px('rope-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Pull', [
        px('barbell-row', 4, 6, 10, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('hammer-curl', 3, 8, 15, 1, 60),
        px('barbell-shrug', 3, 10, 15, 1, 60),
      ]),
      day('Legs', [
        px('back-squat', 4, 6, 10, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 8, 15, 1, 60),
      ]),
      day('Upper', [
        px('incline-db-press', 4, 8, 12, 2, 120),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('machine-lateral-raise', 3, 12, 20, 1, 60),
        px('bayesian-curl', 3, 10, 15, 1, 60),
        px('close-grip-bench', 3, 8, 12, 2, 120),
      ]),
      day('Lower', [
        px('hack-squat', 4, 8, 12, 2, 180),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('leg-extension', 3, 12, 20, 1, 60),
        px('seated-calf-raise', 4, 10, 20, 1, 60),
        px('hanging-leg-raise', 3, 8, 15, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 4-Day High-Frequency Full Body
  {
    id: 'tpl-hf-full-body',
    name: 'High-Frequency Full Body — 4 Day',
    description:
      'An advanced hypertrophy approach: 4 full-body sessions with most muscles trained 4× per week (1–2 exercises each per day). Each day opens with a heavy primary lift, then accessories. Recovery management is the priority.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Day 1 (Squat)', [
        px('back-squat', 4, 5, 8, 2, 210),
        px('incline-db-press', 3, 8, 12, 2, 120),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('seated-leg-curl', 2, 10, 15, 1, 90),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('overhead-triceps-ext', 2, 10, 15, 1, 60),
      ]),
      day('Day 2 (Bench)', [
        px('bench-press', 4, 5, 8, 2, 180),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('leg-extension', 2, 12, 20, 1, 60),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('incline-db-curl', 2, 8, 12, 1, 60),
      ]),
      day('Day 3 (Deadlift)', [
        px('romanian-deadlift', 3, 6, 10, 2, 210),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('leg-press', 3, 10, 15, 2, 120),
        px('lateral-raise', 3, 12, 20, 1, 60),
        px('rope-pushdown', 2, 10, 15, 1, 60),
      ]),
      day('Day 4 (Overhead)', [
        px('ohp', 4, 6, 10, 2, 150),
        px('hack-squat', 3, 8, 12, 2, 150),
        px('pullup', 3, 6, 12, 2, 120),
        px('lying-leg-curl', 2, 10, 15, 1, 90),
        px('bayesian-curl', 3, 10, 15, 1, 60),
        px('standing-calf-raise', 3, 8, 15, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 4-Day Powerbuilding
  {
    id: 'tpl-powerbuilding',
    name: 'Powerbuilding — 4 Day',
    description:
      'Strength and size in one. Each session opens with a heavy low-rep top lift (squat, bench, deadlift, or press), then bodybuilding accessories in moderate–high reps. Built on an Upper/Lower frame, main lifts 2×/week.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Lower (Squat)', [
        px('back-squat', 5, 3, 5, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 8, 15, 1, 60),
      ]),
      day('Upper (Bench)', [
        px('bench-press', 5, 3, 5, 2, 210),
        px('barbell-row', 4, 6, 10, 2, 150),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('ez-bar-curl', 3, 8, 12, 1, 60),
      ]),
      day('Lower (Deadlift)', [
        px('deadlift', 4, 3, 5, 2, 240),
        px('front-squat', 3, 6, 10, 2, 180),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('seated-calf-raise', 4, 10, 20, 1, 60),
      ]),
      day('Upper (Press)', [
        px('ohp', 5, 4, 6, 2, 180),
        px('close-grip-bench', 3, 6, 10, 2, 150),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('cable-rear-delt-fly', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- 2-Day Full Body
  {
    id: 'tpl-full-body-2',
    name: 'Full Body — 2 Day',
    description:
      'A minimalist plan for very busy weeks. Two efficient full-body sessions covering all the major movement patterns. Every muscle trained 2× per week in as little time as possible.',
    daysPerWeek: 2,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Full Body A', [
        px('back-squat', 3, 6, 10, 2, 180),
        px('bench-press', 3, 6, 10, 2, 180),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('standing-calf-raise', 3, 8, 15, 1, 60),
      ]),
      day('Full Body B', [
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('leg-press', 3, 10, 15, 2, 120),
        px('ez-bar-curl', 3, 8, 12, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
    ],
  },

  // ---------------------------------------------------------------- Knee-Resilient Upper/Lower
  {
    id: 'tpl-knee-resilient',
    name: 'Knee-Resilient Upper / Lower — 4 Day',
    description:
      'A knee-conscious 4-day split for training around chronic knee pain (e.g. post-ACL). Lower days start with an isometric primer, prioritize quads AND hamstrings, add hip/glute work to control knee valgus, use knee-friendly tempo and single-leg work, and finish with low-impact sled work — no jumping/impact. Load pain-guided: keep knee pain ≤3/10 during, and it should settle to baseline by the next morning; if not, reduce load, depth, or range. Not medical advice — clear your loading with your surgeon/PT.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Lower A — Quad focus', [
        px('wall-sit', 3, 1, 1, 0, 120),
        px('heels-elevated-squat', 3, 8, 12, 2, 150),
        px('leg-extension', 3, 10, 15, 1, 90),
        px('step-down', 3, 8, 12, 1, 90),
        px('banded-lateral-walk', 2, 12, 20, 1, 60),
        px('backward-sled-drag', 3, 3, 5, 1, 90),
      ]),
      day('Upper A', [
        px('incline-db-press', 4, 8, 12, 2, 120),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('ez-bar-curl', 3, 8, 12, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Lower B — Posterior / Hip', [
        px('romanian-deadlift', 3, 6, 10, 2, 180),
        px('seated-leg-curl', 3, 8, 15, 1, 90),
        px('nordic-curl', 3, 3, 6, 1, 120),
        px('hip-thrust', 3, 8, 15, 2, 120),
        px('tke', 3, 12, 20, 1, 60),
        px('tibialis-raise', 3, 15, 25, 1, 45),
        px('sled-push', 3, 3, 5, 1, 120),
      ]),
      day('Upper B', [
        px('ohp', 4, 6, 10, 2, 150),
        px('pullup', 4, 6, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
      ]),
    ],
  },

  // ------------------------------------------------- PPL + Knee-Resilient legs
  {
    id: 'tpl-ppl-knee',
    name: 'Push · Pull · Legs (Knee-Resilient) — 6 Day',
    description:
      'A full 6-day Push/Pull/Legs where the two leg days are the knee-conscious lower sessions — quad + hamstring priority, isometric primer, hip/glute valgus control, knee-friendly tempo and single-leg work, and low-impact sled finishers (no jumping/impact). Everything trained ~2× per week. Load the legs pain-guided: keep knee pain ≤3/10 and settling by the next morning. Not medical advice — clear your loading with your PT/surgeon.',
    daysPerWeek: 6,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push A', [
        px('bench-press', 4, 6, 10, 2, 180),
        px('machine-shoulder-press', 3, 8, 12, 2, 120),
        px('incline-db-press', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 4, 12, 20, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
        px('rope-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Pull A', [
        px('barbell-row', 4, 6, 10, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('seated-cable-row', 3, 8, 12, 2, 120),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('hammer-curl', 3, 8, 15, 1, 60),
      ]),
      day('Legs A — Quad focus', [
        px('wall-sit', 3, 1, 1, 0, 120),
        px('heels-elevated-squat', 3, 8, 12, 2, 150),
        px('leg-extension', 3, 10, 15, 1, 90),
        px('step-down', 3, 8, 12, 1, 90),
        px('banded-lateral-walk', 2, 12, 20, 1, 60),
        px('backward-sled-drag', 3, 3, 5, 1, 90),
      ]),
      day('Push B', [
        px('ohp', 4, 6, 10, 2, 150),
        px('machine-chest-press', 3, 8, 12, 2, 120),
        px('high-low-cable-fly', 3, 12, 20, 1, 60),
        px('lateral-raise', 4, 12, 20, 1, 60),
        px('close-grip-bench', 3, 8, 12, 2, 120),
        px('skullcrusher', 3, 8, 12, 1, 90),
      ]),
      day('Pull B', [
        px('pullup', 4, 6, 12, 2, 120),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('straight-arm-pulldown', 3, 12, 20, 1, 60),
        px('cable-rear-delt-fly', 3, 12, 20, 1, 60),
        px('bayesian-curl', 3, 10, 15, 1, 60),
        px('barbell-shrug', 3, 10, 15, 1, 60),
      ]),
      day('Legs B — Posterior / Hip', [
        px('romanian-deadlift', 3, 6, 10, 2, 180),
        px('seated-leg-curl', 3, 8, 15, 1, 90),
        px('nordic-curl', 3, 3, 6, 1, 120),
        px('hip-thrust', 3, 8, 15, 2, 120),
        px('tke', 3, 12, 20, 1, 60),
        px('tibialis-raise', 3, 15, 25, 1, 45),
        px('sled-push', 3, 3, 5, 1, 120),
      ]),
    ],
  },
]
