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
 * Built-in programs modeled on Jeff Nippard–style evidence-based hypertrophy
 * training: 2× weekly frequency per muscle, ~10–20 hard sets per muscle per
 * week, most work at 1–3 RIR, compounds first then isolations.
 */
export const TEMPLATES: Plan[] = [
  {
    id: 'tpl-full-body',
    name: 'Full Body — 3 Days',
    description:
      'Great for beginners or busy schedules. Every muscle trained 3× per week. Focus on adding weight or reps each session.',
    daysPerWeek: 3,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Full Body A', [
        px('back-squat', 3, 6, 8, 2, 180),
        px('bench-press', 3, 6, 8, 2, 180),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('lateral-raise', 3, 12, 20, 1, 60),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Full Body B', [
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('ohp', 3, 6, 8, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('leg-press', 3, 10, 15, 2, 120),
        px('incline-db-curl', 3, 8, 12, 1, 60),
        px('standing-calf-raise', 3, 10, 15, 1, 60),
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
  {
    id: 'tpl-upper-lower',
    name: 'Upper / Lower — 4 Days',
    description:
      'The classic 4-day split. Each muscle trained 2× per week with room for solid volume. A great intermediate default.',
    daysPerWeek: 4,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Upper A (Strength)', [
        px('bench-press', 4, 5, 8, 2, 180),
        px('barbell-row', 4, 6, 10, 2, 150),
        px('ohp', 3, 6, 10, 2, 150),
        px('lat-pulldown', 3, 8, 12, 2, 120),
        px('lateral-raise', 3, 12, 20, 1, 60),
        px('barbell-curl', 3, 8, 12, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
      ]),
      day('Lower A (Squat focus)', [
        px('back-squat', 4, 5, 8, 2, 210),
        px('romanian-deadlift', 3, 8, 10, 2, 180),
        px('leg-press', 3, 10, 15, 2, 120),
        px('seated-leg-curl', 3, 10, 15, 1, 90),
        px('standing-calf-raise', 4, 10, 15, 1, 60),
        px('hanging-leg-raise', 3, 8, 15, 1, 60),
      ]),
      day('Upper B (Hypertrophy)', [
        px('incline-db-press', 4, 8, 12, 2, 120),
        px('chest-supported-row', 4, 8, 12, 2, 120),
        px('db-shoulder-press', 3, 8, 12, 2, 120),
        px('pullup', 3, 6, 12, 2, 120),
        px('cable-lateral-raise', 3, 12, 20, 1, 60),
        px('incline-db-curl', 3, 8, 15, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
      ]),
      day('Lower B (Deadlift focus)', [
        px('romanian-deadlift', 4, 6, 10, 2, 210),
        px('hack-squat', 3, 8, 12, 2, 150),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('lying-leg-curl', 3, 10, 15, 1, 90),
        px('seated-calf-raise', 4, 12, 20, 1, 60),
        px('cable-crunch', 3, 10, 20, 1, 60),
      ]),
    ],
  },
  {
    id: 'tpl-ppl',
    name: 'Push / Pull / Legs — 6 Days',
    description:
      'High-volume 6-day split for dedicated lifters. Each muscle trained 2× per week with lots of exercise variety. Demands good recovery.',
    daysPerWeek: 6,
    createdAt: 0,
    builtIn: true,
    days: [
      day('Push A', [
        px('bench-press', 4, 6, 10, 2, 180),
        px('db-shoulder-press', 3, 8, 12, 2, 120),
        px('incline-db-press', 3, 8, 12, 2, 120),
        px('cable-lateral-raise', 4, 12, 20, 1, 60),
        px('triceps-pushdown', 3, 10, 15, 1, 60),
        px('overhead-triceps-ext', 3, 10, 15, 1, 60),
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
        px('standing-calf-raise', 4, 10, 15, 1, 60),
      ]),
      day('Push B', [
        px('ohp', 4, 6, 10, 2, 150),
        px('machine-chest-press', 3, 8, 12, 2, 120),
        px('pec-deck', 3, 12, 20, 1, 60),
        px('lateral-raise', 4, 12, 20, 1, 60),
        px('close-grip-bench', 3, 8, 12, 2, 120),
        px('skullcrusher', 3, 8, 12, 1, 90),
      ]),
      day('Pull B', [
        px('pullup', 4, 6, 12, 2, 120),
        px('chest-supported-row', 3, 8, 12, 2, 120),
        px('straight-arm-pulldown', 3, 12, 20, 1, 60),
        px('reverse-pec-deck', 3, 12, 20, 1, 60),
        px('barbell-curl', 3, 8, 12, 1, 60),
        px('barbell-shrug', 3, 10, 15, 1, 60),
      ]),
      day('Legs B', [
        px('hack-squat', 4, 8, 12, 2, 180),
        px('hip-thrust', 3, 8, 15, 2, 120),
        px('bulgarian-split-squat', 3, 8, 12, 2, 120),
        px('leg-extension', 3, 12, 20, 1, 60),
        px('seated-calf-raise', 4, 12, 20, 1, 60),
      ]),
    ],
  },
]
