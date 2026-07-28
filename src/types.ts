export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Calves'
  | 'Shins'
  | 'Abs'
  | 'Forearms'
  | 'Traps'

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Smith'
  | 'Bodyweight'
  | 'Sled'
  | 'Band'
  | 'Other'

export type ExerciseCategory = 'Compound' | 'Isolation'

export interface Exercise {
  id: string
  name: string
  primary: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment
  category: ExerciseCategory
  /** Short selection rationale / why this exercise earns its place. */
  notes?: string
  /** Recommended hypertrophy rep range. */
  repRange?: [number, number]
  /** Step-by-step setup and execution. */
  howTo?: string[]
  /** Key form cues to keep in mind mid-set. */
  cues?: string[]
  /** Common mistakes to avoid. */
  mistakes?: string[]
  /** One-line biomechanical rationale (where tension/stretch peaks, etc.). */
  science?: string
  /** Labels like 'Knee-friendly', 'Isometric', 'Tempo/HSR', 'BFR', 'Sled', 'Activation', 'Rehab'. */
  tags?: string[]
  /** Medical/technique caution shown as a highlighted banner on the detail page. */
  caution?: string
  /**
   * Exclude from weekly volume-landmark accounting. For work that isn't a
   * conventional "hard set" — isometric holds and low-impact sled capacity
   * work — so it doesn't inflate set counts against MEV/MAV/MRV.
   */
  excludeFromVolume?: boolean
  custom?: boolean
}

/**
 * A single prescribed set. Lets a plan specify a real scheme per set
 * (e.g. a heavier top set at 1 RIR, then back-off sets at 2 RIR) instead of
 * one blanket sets×reps for every exercise.
 */
export interface PrescribedSet {
  repMin: number
  repMax: number
  /** Target reps-in-reserve for this specific set. */
  rir: number
  restSec: number
  /** Optional label, e.g. 'Top set', 'Back-off', 'Myo-rep', 'Hold'. */
  label?: string
  /** Optional tempo prescription, e.g. '3-1-3'. */
  tempo?: string
  /** Set is a timed hold (isometric); reps fields represent seconds. */
  isHold?: boolean
}

export interface PlanExercise {
  id: string
  exerciseId: string
  /** Number of sets — kept as the summary/fallback when `scheme` is absent. */
  sets: number
  repMin: number
  repMax: number
  /** Target reps-in-reserve (fallback when `scheme` is absent). */
  rir: number
  restSec: number
  /**
   * Per-set prescription. When present it is authoritative and its length is
   * the real set count; `sets`/`repMin`/`repMax`/`rir`/`restSec` mirror set 1
   * for backwards compatibility.
   */
  scheme?: PrescribedSet[]
  /** Coaching intent for this slot, e.g. 'Primary strength', 'Stretch-biased'. */
  role?: string
  note?: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Plan {
  id: string
  name: string
  description?: string
  daysPerWeek: number
  days: PlanDay[]
  createdAt: number
  builtIn?: boolean
  /** Template this plan was created from, so it can be refreshed later. */
  sourceTemplateId?: string
}

export interface LoggedSet {
  reps: number
  weight: number
  rir?: number
  done: boolean
  /** Prescription carried from the plan, shown as the target for this set. */
  target?: {
    repMin: number
    repMax: number
    rir: number
    restSec: number
    label?: string
    tempo?: string
    isHold?: boolean
  }
}

export interface LoggedExercise {
  exerciseId: string
  sets: LoggedSet[]
  note?: string
  /** Rest target (seconds) carried from the plan, used by the rest timer. */
  restSec?: number
}

export interface Session {
  id: string
  date: number
  planId?: string
  dayId?: string
  name: string
  exercises: LoggedExercise[]
  durationSec?: number
  finishedAt?: number
}

export type Unit = 'lb' | 'kg'

export interface Settings {
  unit: Unit
  name?: string
}
