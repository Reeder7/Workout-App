import { useEffect, useState } from 'react'
import { authRedirectUrl, getSupabase, isConfigured } from './supabase'
import { withTimeout } from './members'
import { clearStashedAuthError, takeStashedAuthError } from './authCallback'
import {
  explainAuthError,
  isRateLimit,
  markSent,
  RATE_LIMIT_COOLDOWN_SEC,
} from './authErrors'
import type { AuthCallback } from './authCallback'
import type { MemberProfile, MemberStatus } from '../types'

export interface AuthState {
  /** True until the first session check finishes. */
  loading: boolean
  userId: string | null
  email: string | null
  /** Null when signed in but the profile form hasn't been completed. */
  profile: MemberProfile | null
  /** Something went wrong reading your session or profile. */
  error: string | null
  /**
   * A sign-in link or code failed. Kept apart from `error` because they were
   * overwriting each other: refreshProfile's `error: null` erased a link
   * failure, and the session catch replaced one with the other.
   */
  linkError: string | null
}

const initial: AuthState = {
  loading: isConfigured,
  userId: null,
  email: null,
  profile: null,
  error: null,
  linkError: null,
}

/** Redeeming a single-use link deserves longer than an ordinary read. */
const REDEEM_TIMEOUT_MS = 30_000
/*
 * Deliberately does not claim the link was consumed: the exchange may have
 * completed and persisted a session even though the response never arrived,
 * which is why reloading is the first suggestion.
 */
const REDEEM_FAILED =
  'Could not reach the server to finish signing in. Reload this page — if you are still signed out, request a new code.'

let state: AuthState = initial
const listeners = new Set<(s: AuthState) => void>()

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}

interface ProfileRow {
  id: string
  email: string | null
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
  email: r.email ?? undefined,
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

/**
 * Reads the stored session, applies any auth callback taken out of the URL, and
 * follows sign-in and sign-out from then on.
 */
export async function initAuth(callback?: AuthCallback) {
  if (started || !isConfigured) return
  started = true

  // Always drain the stash, then prefer the live callback — otherwise a stashed
  // message re-fires on every later page load.
  const stashed = takeStashedAuthError()
  const linkFailure = callback?.kind === 'error' ? callback.message : stashed
  /*
   * Reported, but never a stopping point. This used to `return` here, which
   * skipped registering onAuthStateChange — so the 6-digit code the message
   * itself recommends would succeed against the server and never move the UI.
   * A stale link also made a user with a valid stored session render as signed
   * out. `loading` is left for the finally so that never flashes.
   */
  if (linkFailure) set({ linkError: linkFailure })

  async function redeem(run: () => PromiseLike<{ error: { message: string } | null }>) {
    try {
      const { error } = await withTimeout(run(), REDEEM_TIMEOUT_MS)
      // A resolved error carries the precise wording — the wrong-browser advice
      // is the useful one — so it must not be replaced by the timeout message.
      if (error) set({ linkError: explainAuthError(error.message) })
    } catch {
      set({ linkError: REDEEM_FAILED })
    }
  }

  try {
    const sb = await withTimeout(getSupabase())

    /*
     * Registered before redemption on purpose: a redemption that resolves after
     * our own cutoff still fires SIGNED_IN, and the UI heals itself with no
     * reload. Registering afterwards missed that entirely.
     */
    sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      set({ userId: u?.id ?? null, email: u?.email ?? null })
      if (u) {
        // Arriving signed in retires any link complaint.
        clearAuthError()
        void refreshProfile()
      } else {
        set({ profile: null })
      }
    })

    // Callbacks are applied by hand because detectSessionInUrl is off; see the
    // comment in lib/supabase.ts for why.
    if (callback?.kind === 'implicit' && callback.accessToken && callback.refreshToken) {
      await redeem(() =>
        sb.auth.setSession({
          access_token: callback.accessToken!,
          refresh_token: callback.refreshToken!,
        }),
      )
    } else if (callback?.kind === 'pkce' && callback.code) {
      await redeem(() => sb.auth.exchangeCodeForSession(callback.code!))
    } else if (callback?.kind === 'token-hash' && callback.tokenHash) {
      // Reachable only if the email template is switched to {{ .TokenHash }}.
      // Needs no verifier, so unlike PKCE it works from any browser.
      await redeem(() =>
        sb.auth.verifyOtp({
          token_hash: callback.tokenHash!,
          type: (callback.tokenType ?? 'email') as 'email',
        }),
      )
    }

    const { data } = await withTimeout(sb.auth.getSession())
    const user = data.session?.user ?? null
    set({ userId: user?.id ?? null, email: user?.email ?? null })
    if (user) set({ profile: await withTimeout(loadProfile(user.id)) })
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'Could not restore your session' })
  } finally {
    set({ loading: false })
  }
}

/** Retires a link complaint once the user has acted on it. */
export function clearAuthError() {
  clearStashedAuthError()
  set({ linkError: null })
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
  /*
   * Stamped even on failure: a rejected request still consumed an attempt. A
   * throttle rejection gets the long cooldown, because the ceiling is per hour
   * and a 60s retry is guaranteed to fail.
   */
  if (error && isRateLimit(error.message)) {
    markSent(RATE_LIMIT_COOLDOWN_SEC)
  } else {
    markSent()
  }
  if (error) throw new Error(explainAuthError(error.message))
}

/**
 * Verifies a 6-digit code from the email.
 *
 * This is the path that actually works from a phone. A magic link is opened by
 * whichever browser the mail app hands it to — Outlook opens Safari, and an
 * installed PWA has its own storage — so the PKCE verifier stored by the browser
 * that *requested* the link is usually not there when it is *opened*. A code has
 * no verifier and no redirect, so it works from anywhere.
 */
export async function verifyEmailCode(email: string, token: string) {
  const sb = await getSupabase()
  const { error } = await withTimeout(
    sb.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' }),
  )
  if (error) throw new Error(explainAuthError(error.message))
  clearAuthError()
  set({ error: null })
  await refreshProfile()
}

export interface ProfileInput {
  displayName: string
  age?: number
  heightCm?: number
  weightKg?: number
}

export interface JoinInput extends ProfileInput {
  code: string
}

/**
 * Joins with an access code instead of an email.
 *
 * Signs in anonymously first — a real auth user with the `authenticated` role and
 * no email address — then redeems the code server-side. The code is never checked
 * before sign-in on purpose: anonymous sign-ins are IP rate-limited by GoTrue, so
 * guessing has to get past that, whereas a pre-auth check callable by `anon` would
 * have had no ceiling at all.
 */
export async function joinWithCode(input: JoinInput) {
  const sb = await withTimeout(getSupabase())

  // Reuse an existing session rather than minting another anonymous user each
  // time someone corrects a typo in the code.
  const { data: existing } = await withTimeout(sb.auth.getSession())
  if (!existing.session) {
    const { error } = await withTimeout(sb.auth.signInAnonymously())
    if (error) throw new Error(explainAuthError(error.message))
  }

  const { error } = await withTimeout(
    sb.rpc('join_with_code', {
      code: input.code.trim(),
      display_name: input.displayName.trim(),
      age: input.age ?? null,
      height_cm: input.heightCm ?? null,
      weight_kg: input.weightKg ?? null,
    }),
  )
  if (error) {
    /*
     * A wrong code leaves an anonymous user with no profile row. Signing back out
     * keeps the app from looking half-joined, and the orphan is invisible: every
     * policy keys off an approved profile, which it does not have.
     */
    if (!existing.session) await signOut()
    throw new Error(explainAuthError(error.message))
  }
  clearAuthError()
  await refreshProfile()
}

export async function signOut() {
  try {
    const sb = await withTimeout(getSupabase())
    await withTimeout(sb.auth.signOut())
  } catch {
    /*
     * Cleared regardless. auth-js purges local storage on every failure path, so
     * there is no session to resurrect — and letting a throw skip the clear would
     * leave the UI signed in with a dead session and a dead button.
     */
  } finally {
    set({ userId: null, email: null, profile: null, error: null, linkError: null })
    clearStashedAuthError()
  }
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
