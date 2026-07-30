export type CallbackKind = 'none' | 'implicit' | 'pkce' | 'error'

export interface AuthCallback {
  kind: CallbackKind
  accessToken?: string
  refreshToken?: string
  code?: string
  errorCode?: string
  message?: string
}

const NONE: AuthCallback = { kind: 'none' }
const STASH_KEY = 'spotter-auth-error'

/*
 * The callback lives in memory, so anything that reloads the page loses it. A
 * service-worker update is the obvious culprit, but so is the browser restoring a
 * tab. Parking the message in sessionStorage means the reason a link failed
 * survives one reload and still reaches the user.
 */
function stash(message: string) {
  try {
    sessionStorage.setItem(STASH_KEY, message)
  } catch {
    /* private mode or a full quota: the message is simply lost */
  }
}

/** Reads and clears a stashed error, so it shows once and not again. */
export function takeStashedAuthError(): string | null {
  try {
    const v = sessionStorage.getItem(STASH_KEY)
    if (v) sessionStorage.removeItem(STASH_KEY)
    return v
  } catch {
    return null
  }
}

/** Human wording for the error codes GoTrue actually sends back. */
function describe(code: string | null, description: string | null): string {
  const d = (description ?? '').replace(/\+/g, ' ')
  switch (code) {
    case 'otp_expired':
      return 'That sign-in link has expired. Links are single-use and short-lived — request a new one.'
    case 'access_denied':
      return 'That link was rejected. It may already have been used. Request a new one.'
    case 'flow_state_not_found':
    case 'flow_state_expired':
      return 'Open the link in the same browser you requested it from. Request a new one here.'
    default:
      return d || 'That sign-in link did not work. Request a new one.'
  }
}

/**
 * Reads an auth callback out of the URL and clears it, BEFORE the router mounts.
 *
 * This has to happen first because the app uses hash routing. GoTrue's implicit
 * flow returns "#access_token=...&refresh_token=...", and an expired link returns
 * "#error=access_denied&error_code=otp_expired". HashRouter reads either as a
 * route path, matches nothing, and renders an empty page — which is exactly the
 * blank screen this fixes.
 *
 * The tokens are handed to Supabase explicitly rather than through
 * detectSessionInUrl, because the SDK is loaded lazily and would arrive after the
 * URL had already been rewritten.
 */
export function takeAuthCallback(): AuthCallback {
  if (typeof window === 'undefined') return NONE

  const rawHash = window.location.hash.replace(/^#/, '')
  // A hash that starts with "/" is one of our own routes, not a callback.
  const hashParams = rawHash && !rawHash.startsWith('/') ? new URLSearchParams(rawHash) : null
  const queryParams = new URLSearchParams(window.location.search)

  const pick = (key: string) => hashParams?.get(key) ?? queryParams.get(key)

  const accessToken = pick('access_token')
  const refreshToken = pick('refresh_token')
  const code = pick('code')
  const error = pick('error')
  const errorCode = pick('error_code')
  const errorDescription = pick('error_description')

  if (!accessToken && !code && !error && !errorCode) return NONE

  // Keep an explicit route if one was already there, else land on Join, which is
  // where every one of these outcomes needs to be reported.
  const route = rawHash.startsWith('/') ? rawHash : '/join'
  window.history.replaceState(null, '', `${window.location.pathname}#${route}`)

  if (error || errorCode) {
    const message = describe(errorCode ?? error, errorDescription)
    stash(message)
    return { kind: 'error', errorCode: errorCode ?? error ?? undefined, message }
  }
  if (accessToken && refreshToken) return { kind: 'implicit', accessToken, refreshToken }
  if (accessToken) {
    // A token with no refresh token cannot establish a durable session.
    return {
      kind: 'error',
      errorCode: 'missing_refresh_token',
      message: 'That link was incomplete. Request a new one.',
    }
  }
  return { kind: 'pkce', code: code ?? undefined }
}
