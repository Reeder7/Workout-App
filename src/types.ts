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
  | 'Other'

export type ExerciseCategory = 'Compound' | 'Isolation'

export interface Exercise {
  id: string
  name: string
  primary: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment
  category: ExerciseCategory
  /** Jeff Nippard–style coaching cue / selection rationale. */
  notes?: string
  /** Recommended hypertrophy rep range. */
  repRange?: [number, number]
  custom?: boolean
}

export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  /** Target reps-in-reserve (Nippard autoregulation). */
  rir: number
  restSec: number
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
}

export interface LoggedSet {
  reps: number
  weight: number
  rir?: number
  done: boolean
}

export interface LoggedExercise {
  exerciseId: string
  sets: LoggedSet[]
  note?: string
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
