import { useEffect, useState } from 'react'
import { authRedirectUrl, getSupabase, isConfigured } from './supabase'
import { withTimeout } from './members'
import type { MemberProfile, MemberStatus } from '../types'

export interface AuthState {
  /** True until the first session check finishes. */
  loading: boolean
  userId: string | null
  email: string | null
  /** Null when signed in but the profile form hasn't been completed. */
  profile: MemberProfile | null
  error: string | null
}

const initial: AuthState = {
  loading: isConfigured,
  userId: null,
  email: null,
  profile: null,
  error: null,
}

let state: AuthState = initial
const listeners = new Set<(s: AuthState) => void>()

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}

interface ProfileRow {
  id: string
  email: string
  display_name: string
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  status: MemberStatus
  created_at: string
  reviewed_at: string | null
}

const toProfile = (r: ProfileRow): MemberProfile => ({
  id: r.id,
  email: r.email,
  displayName: r.display_name,
  age: r.age ?? undefined,
  heightCm: r.height_cm ?? undefined,
  weightKg: r.weight_kg ?? undefined,
  status: r.status,
  createdAt: new Date(r.created_at).getTime(),
  reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
})

async function loadProfile(userId: string) {
  const sb = await getSupabase()
  const { data, error } = await sb
    .from('profiles')
    .select('id,email,display_name,age,height_cm,weight_kg,status,created_at,reviewed_at')
    .eq('id', userId)
    .maybeSingle()
  // A missing row is the normal state right after sign-in, not a failure.
  if (error) throw new Error(error.message)
  return data ? toProfile(data as ProfileRow) : null
}

let started = false

/** Reads the stored session and follows sign-in and sign-out from then on. */
export async function initAuth() {
  if (started || !isConfigured) return
  started = true
  try {
    const sb = await getSupabase()
    const { data } = await sb.auth.getSession()
    const user = data.session?.user ?? null

    sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      set({ userId: u?.id ?? null, email: u?.email ?? null })
      if (u) {
        void refreshProfile()
      } else {
        set({ profile: null })
      }
    })

    set({ userId: user?.id ?? null, email: user?.email ?? null })
    if (user) set({ profile: await withTimeout(loadProfile(user.id)) })
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'Could not restore your session' })
  } finally {
    set({ loading: false })
  }
}

export async function refreshProfile() {
  if (!state.userId) return
  try {
    set({ profile: await withTimeout(loadProfile(state.userId)), error: null })
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'Could not load your profile' })
  }
}

/** Sends a one-time sign-in link. No password is ever created. */
export async function signInWithEmail(email: string) {
  const sb = await getSupabase()
  const { error } = await withTimeout(
    sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() },
    }),
  )
  if (error) throw new Error(error.message)
}

export async function signOut() {
  const sb = await getSupabase()
  await sb.auth.signOut()
  set({ userId: null, email: null, profile: null })
}

export interface ProfileInput {
  displayName: string
  age?: number
  heightCm?: number
  weightKg?: number
}

/**
 * Creates or updates your own profile row. On insert a database trigger forces
 * status to pending and is_admin to false, so nothing here is trusted.
 */
export async function saveMyProfile(input: ProfileInput) {
  if (!state.userId || !state.email) throw new Error('You are not signed in')
  const sb = await getSupabase()
  const fields = {
    display_name: input.displayName.trim(),
    age: input.age ?? null,
    height_cm: input.heightCm ?? null,
    weight_kg: input.weightKg ?? null,
  }

  const { error } = state.profile
    ? await withTimeout(sb.from('profiles').update(fields).eq('id', state.userId))
    : await withTimeout(
        sb.from('profiles').insert({ id: state.userId, email: state.email, ...fields }),
      )
  if (error) throw new Error(error.message)
  await refreshProfile()
}

export function useAuth(): AuthState {
  const [snapshot, setSnapshot] = useState(state)
  useEffect(() => {
    listeners.add(setSnapshot)
    setSnapshot(state)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])
  return snapshot
}
