import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Exercise,
  LoggedSet,
  Plan,
  PlanDay,
  PrescribedSet,
  Session,
  Settings,
} from '../types'
import { EXERCISES } from '../data/exercises'
import { TEMPLATES } from '../data/templates'
import { blockState, deloadScheme } from '../lib/mesocycle'

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clonePlan(source: Plan, opts: { asCopy?: boolean } = {}): Plan {
  return {
    ...source,
    id: uid('plan'),
    builtIn: false,
    createdAt: Date.now(),
    name: opts.asCopy ? `${source.name} (copy)` : source.name,
    days: source.days.map((d) => ({
      ...d,
      id: uid('day'),
      exercises: d.exercises.map((e) => ({ ...e, id: uid('pe') })),
    })),
  }
}

interface State {
  plans: Plan[]
  sessions: Session[]
  customExercises: Exercise[]
  settings: Settings
  activeSession: Session | null
  /** Persistent per-exercise notes, keyed by exerciseId, saved across workouts. */
  exerciseNotes: Record<string, string>

  // exercises
  allExercises: () => Exercise[]
  addCustomExercise: (e: Omit<Exercise, 'id' | 'custom'>) => Exercise
  setExerciseNote: (exerciseId: string, note: string) => void

  // plans
  addPlan: (plan: Plan) => void
  updatePlan: (plan: Plan) => void
  deletePlan: (id: string) => void
  duplicatePlan: (id: string) => void
  addPlanFromTemplate: (templateId: string) => Plan | undefined
  /** Re-copy a plan's days from its source template, keeping the plan's id. */
  refreshPlanFromTemplate: (planId: string) => boolean
  createEmptyPlan: () => Plan
  /** Begin (or restart) a plan's training block from today. */
  startBlock: (planId: string, weeks?: number) => void

  // active workout
  startSession: (plan?: Plan, day?: PlanDay) => void
  startEmptySession: () => void
  addExerciseToActive: (exerciseId: string) => void
  removeExerciseFromActive: (index: number) => void
  /** Replace an exercise mid-workout, keeping its set structure and targets. */
  swapExerciseInActive: (index: number, newExerciseId: string) => void
  addSet: (exerciseIndex: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<LoggedSet>) => void
  /**
   * Nudge a set's RIR, resolving the current value from live state so two fast
   * taps can't both read the same stale prop and collapse into one step.
   */
  stepRir: (exerciseIndex: number, setIndex: number, delta: number) => void
  removeSet: (exerciseIndex: number, setIndex: number) => void
  finishSession: () => void
  discardActiveSession: () => void
  deleteSession: (id: string) => void

  // settings + data
  setSettings: (patch: Partial<Settings>) => void
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      plans: [],
      sessions: [],
      customExercises: [],
      settings: { unit: 'lb', theme: 'light' },
      activeSession: null,
      exerciseNotes: {},

      allExercises: () => [...EXERCISES, ...get().customExercises],

      addCustomExercise: (e) => {
        const ex: Exercise = { ...e, id: uid('ex'), custom: true }
        set((s) => ({ customExercises: [...s.customExercises, ex] }))
        return ex
      },
      setExerciseNote: (exerciseId, note) =>
        set((s) => ({ exerciseNotes: { ...s.exerciseNotes, [exerciseId]: note } })),

      addPlan: (plan) => set((s) => ({ plans: [...s.plans, plan] })),
      updatePlan: (plan) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? plan : p)) })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      duplicatePlan: (id) => {
        const p = get().plans.find((x) => x.id === id)
        if (p) set((s) => ({ plans: [...s.plans, clonePlan(p, { asCopy: true })] }))
      },
      addPlanFromTemplate: (templateId) => {
        const t = TEMPLATES.find((x) => x.id === templateId)
        if (!t) return undefined
        const plan = { ...clonePlan(t), sourceTemplateId: t.id }
        set((s) => ({ plans: [...s.plans, plan] }))
        return plan
      },
      refreshPlanFromTemplate: (planId) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return false
        // Match by recorded source, falling back to name for plans created
        // before that link existed.
        const t =
          TEMPLATES.find((x) => x.id === plan.sourceTemplateId) ??
          TEMPLATES.find((x) => x.name === plan.name)
        if (!t) return false
        const fresh = clonePlan(t)
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  name: t.name,
                  description: t.description,
                  daysPerWeek: t.daysPerWeek,
                  days: fresh.days,
                  sourceTemplateId: t.id,
                }
              : p,
          ),
        }))
        return true
      },
      createEmptyPlan: () => {
        const plan: Plan = {
          id: uid('plan'),
          name: 'New Plan',
          description: '',
          daysPerWeek: 1,
          createdAt: Date.now(),
          days: [{ id: uid('day'), name: 'Day 1', exercises: [] }],
        }
        set((s) => ({ plans: [...s.plans, plan] }))
        return plan
      },

      startBlock: (planId, weeks) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? { ...p, blockStartedAt: Date.now(), blockWeeks: weeks ?? p.blockWeeks }
              : p,
          ),
        })),

      startSession: (plan, day) => {
        // First session from a plan starts its block, so week tracking needs no
        // separate setup step.
        if (plan && !plan.blockStartedAt) {
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === plan.id && !p.blockStartedAt ? { ...p, blockStartedAt: Date.now() } : p,
            ),
          }))
        }
        const deloading = !!plan && blockState(plan)?.isDeload === true
        const session: Session = {
          id: uid('sess'),
          date: Date.now(),
          deload: deloading || undefined,
          planId: plan?.id,
          dayId: day?.id,
          name: day ? `${plan?.name ?? ''} · ${day.name}`.trim() : 'Workout',
          exercises: (day?.exercises ?? []).map((pe) => {
            // A per-set scheme is authoritative; otherwise fall back to the
            // flat sets/reps/rir prescription repeated for each set.
            const prescribed: PrescribedSet[] =
              pe.scheme && pe.scheme.length > 0
                ? pe.scheme
                : Array.from({ length: Math.max(1, pe.sets) }, () => ({
                    repMin: pe.repMin,
                    repMax: pe.repMax,
                    rir: pe.rir,
                    restSec: pe.restSec,
                  }))
            // In the deload week the session is generated lighter rather than
            // relying on the lifter to remember to hold back.
            const scheme = deloading ? deloadScheme(prescribed) : prescribed
            return {
              exerciseId: pe.exerciseId,
              note: pe.note,
              restSec: pe.restSec,
              // rir is deliberately left unset: it is an observation, not a
              // prescription. The target below drives the ghost value, and
              // completing a set commits it only if nothing was entered.
              sets: scheme.map((ps) => ({
                reps: 0,
                weight: 0,
                done: false,
                target: {
                  repMin: ps.repMin,
                  repMax: ps.repMax,
                  rir: ps.rir,
                  restSec: ps.restSec,
                  label: ps.label,
                  tempo: ps.tempo,
                  isHold: ps.isHold,
                },
              })),
            }
          }),
        }
        set({ activeSession: session })
      },
      startEmptySession: () => {
        set({
          activeSession: {
            id: uid('sess'),
            date: Date.now(),
            name: 'Quick Workout',
            exercises: [],
          },
        })
      },
      addExerciseToActive: (exerciseId) =>
        set((s) => {
          if (!s.activeSession) return s
          return {
            activeSession: {
              ...s.activeSession,
              exercises: [
                ...s.activeSession.exercises,
                { exerciseId, sets: [{ reps: 0, weight: 0, done: false }] },
              ],
            },
          }
        }),
      removeExerciseFromActive: (index) =>
        set((s) => {
          if (!s.activeSession) return s
          return {
            activeSession: {
              ...s.activeSession,
              exercises: s.activeSession.exercises.filter((_, i) => i !== index),
            },
          }
        }),
      swapExerciseInActive: (index, newExerciseId) =>
        set((s) => {
          if (!s.activeSession) return s
          const exercises = s.activeSession.exercises.map((ex, i) => {
            if (i !== index) return ex
            // Keep the prescription (set count and per-set targets) but clear
            // the logged numbers — they belonged to the old movement.
            return {
              ...ex,
              exerciseId: newExerciseId,
              sets: ex.sets.map((st) => ({
                reps: 0,
                weight: 0,
                rir: st.target?.rir ?? st.rir,
                done: false,
                target: st.target,
              })),
            }
          })
          return { activeSession: { ...s.activeSession, exercises } }
        }),
      addSet: (exerciseIndex) =>
        set((s) => {
          if (!s.activeSession) return s
          const exercises = s.activeSession.exercises.map((ex, i) => {
            if (i !== exerciseIndex) return ex
            const last = ex.sets[ex.sets.length - 1]
            return {
              ...ex,
              sets: [
                ...ex.sets,
                { reps: last?.reps ?? 0, weight: last?.weight ?? 0, rir: last?.rir, done: false },
              ],
            }
          })
          return { activeSession: { ...s.activeSession, exercises } }
        }),
      updateSet: (exerciseIndex, setIndex, patch) =>
        set((s) => {
          if (!s.activeSession) return s
          const exercises = s.activeSession.exercises.map((ex, i) => {
            if (i !== exerciseIndex) return ex
            return {
              ...ex,
              sets: ex.sets.map((st, j) => (j === setIndex ? { ...st, ...patch } : st)),
            }
          })
          return { activeSession: { ...s.activeSession, exercises } }
        }),
      stepRir: (exerciseIndex, setIndex, delta) =>
        set((s) => {
          if (!s.activeSession) return s
          const exercises = s.activeSession.exercises.map((ex, i) => {
            if (i !== exerciseIndex) return ex
            return {
              ...ex,
              sets: ex.sets.map((st, j) => {
                if (j !== setIndex) return st
                // An unset RIR steps from the prescription, not from zero.
                const from = st.rir ?? st.target?.rir ?? 2
                return { ...st, rir: Math.min(6, Math.max(0, from + delta)) }
              }),
            }
          })
          return { activeSession: { ...s.activeSession, exercises } }
        }),
      removeSet: (exerciseIndex, setIndex) =>
        set((s) => {
          if (!s.activeSession) return s
          const exercises = s.activeSession.exercises.map((ex, i) => {
            if (i !== exerciseIndex) return ex
            return { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) }
          })
          return { activeSession: { ...s.activeSession, exercises } }
        }),
      finishSession: () =>
        set((s) => {
          if (!s.activeSession) return s
          // Keep only exercises with at least one completed set.
          const cleaned: Session = {
            ...s.activeSession,
            finishedAt: Date.now(),
            durationSec: Math.round((Date.now() - s.activeSession.date) / 1000),
            exercises: s.activeSession.exercises
              .map((ex) => ({ ...ex, sets: ex.sets.filter((st) => st.done) }))
              .filter((ex) => ex.sets.length > 0),
          }
          if (cleaned.exercises.length === 0) return { activeSession: null }
          return { sessions: [cleaned, ...s.sessions], activeSession: null }
        }),
      discardActiveSession: () => set({ activeSession: null }),
      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      exportData: () => {
        const { plans, sessions, customExercises, settings, exerciseNotes } = get()
        return JSON.stringify(
          {
            version: 1,
            exportedAt: Date.now(),
            plans,
            sessions,
            customExercises,
            settings,
            exerciseNotes,
          },
          null,
          2,
        )
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (!data || typeof data !== 'object') return false

          const isObj = (v: unknown): v is Record<string, unknown> =>
            !!v && typeof v === 'object' && !Array.isArray(v)
          const validPlan = (p: unknown) =>
            isObj(p) &&
            typeof p.id === 'string' &&
            typeof p.name === 'string' &&
            Array.isArray(p.days) &&
            p.days.every(
              (d) => isObj(d) && typeof d.id === 'string' && Array.isArray(d.exercises),
            )
          const validSession = (s: unknown) =>
            isObj(s) &&
            typeof s.id === 'string' &&
            typeof s.date === 'number' &&
            Array.isArray(s.exercises) &&
            s.exercises.every((e) => isObj(e) && Array.isArray((e as { sets?: unknown }).sets))
          const validExercise = (e: unknown) =>
            isObj(e) && typeof e.id === 'string' && typeof e.name === 'string'

          // Every provided collection must be well-formed, or we reject the
          // whole import rather than persist partially-corrupt state.
          if (data.plans !== undefined && (!Array.isArray(data.plans) || !data.plans.every(validPlan)))
            return false
          if (
            data.sessions !== undefined &&
            (!Array.isArray(data.sessions) || !data.sessions.every(validSession))
          )
            return false
          if (
            data.customExercises !== undefined &&
            (!Array.isArray(data.customExercises) || !data.customExercises.every(validExercise))
          )
            return false
          if (data.settings !== undefined) {
            if (!isObj(data.settings) || (data.settings.unit !== 'lb' && data.settings.unit !== 'kg'))
              return false
          }
          if (data.exerciseNotes !== undefined && !isObj(data.exerciseNotes)) return false

          set((s) => ({
            plans: Array.isArray(data.plans) ? data.plans : s.plans,
            sessions: Array.isArray(data.sessions) ? data.sessions : s.sessions,
            customExercises: Array.isArray(data.customExercises)
              ? data.customExercises
              : s.customExercises,
            settings: isObj(data.settings) ? (data.settings as Settings) : s.settings,
            exerciseNotes: isObj(data.exerciseNotes)
              ? (data.exerciseNotes as Record<string, string>)
              : s.exerciseNotes,
          }))
          return true
        } catch {
          return false
        }
      },
      resetAll: () =>
        set({
          plans: [],
          sessions: [],
          customExercises: [],
          settings: { unit: 'lb', theme: 'light' },
          activeSession: null,
          exerciseNotes: {},
        }),
    }),
    // Do not rename this key. It is where every plan, workout and note lives;
    // changing it makes existing installs look like a fresh, empty app.
    { name: 'iron-log-v1' },
  ),
)
