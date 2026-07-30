export type CallbackKind = 'none' | 'implicit' | 'pkce' | 'token-hash' | 'notice' | 'error'

export interface AuthCallback {
  kind: CallbackKind
  accessToken?: string
  refreshToken?: string
  code?: string
  /** Present when the email template was switched to {{ .TokenHash }}. */
  tokenHash?: string
  tokenType?: string
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

/** Drops a stashed error without reading it, once the user has moved on. */
export function clearStashedAuthError() {
  try {
    sessionStorage.removeItem(STASH_KEY)
  } catch {
    /* nothing to do */
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

  /*
   * react-router deliberately leaves a "."-prefixed hash un-normalised, so "#.foo"
   * matches neither a route nor path="*" and renders an empty page. Nudge it onto
   * a shape the catch-all can see. Nothing to do with auth — it is the last
   * genuinely blank URL.
   */
  if (rawHash.startsWith('.')) {
    window.history.replaceState(null, '', `${window.location.pathname}#/${rawHash}`)
    return NONE
  }

  /*
   * GoTrue can append its parameters after an existing hash route, giving
   * "#/join#access_token=...". Treat the tail after a second "#" as the callback.
   * Only "#" is split on: "?" would break "#/import?d=..." by feeding a shared
   * plan's payload into exchangeCodeForSession.
   */
  const secondHash = rawHash.indexOf('#')
  const routePart = secondHash >= 0 ? rawHash.slice(0, secondHash) : rawHash
  const callbackPart = secondHash >= 0 ? rawHash.slice(secondHash + 1) : rawHash

  // A hash that starts with "/" is one of our own routes, not a callback.
  const hashParams =
    callbackPart && !callbackPart.startsWith('/') ? new URLSearchParams(callbackPart) : null
  const queryParams = new URLSearchParams(window.location.search)

  const pick = (key: string) => hashParams?.get(key) ?? queryParams.get(key)

  const accessToken = pick('access_token')
  const refreshToken = pick('refresh_token')
  const code = pick('code')
  const tokenHash = pick('token_hash')
  const tokenType = pick('type')
  const error = pick('error')
  const errorCode = pick('error_code')
  const errorDescription = pick('error_description')
  const notice = pick('message')
  /*
   * GoTrue sets `sb=` on every redirect it builds, precisely so a client can tell
   * its redirects apart from anything else. Recognising it means an otherwise
   * unfamiliar shape is still cleared from the URL rather than left to render as
   * "page not found".
   */
  const isGoTrue = pick('sb') != null

  if (!accessToken && !code && !tokenHash && !error && !errorCode && !notice && !isGoTrue) {
    return NONE
  }

  // Keep an explicit route if one was already there, else land on Join, which is
  // where every one of these outcomes needs to be reported.
  const route = routePart.startsWith('/') ? routePart : '/join'
  window.history.replaceState(null, '', `${window.location.pathname}#${route}`)

  if (error || errorCode) {
    const message = describe(errorCode ?? error, errorDescription)
    stash(message)
    return { kind: 'error', errorCode: errorCode ?? error ?? undefined, message }
  }
  if (accessToken && refreshToken) return { kind: 'implicit', accessToken, refreshToken }
  if (tokenHash) return { kind: 'token-hash', tokenHash, tokenType: tokenType ?? 'email' }
  if (notice) return { kind: 'notice', message: notice.replace(/\+/g, ' ') }
  if (accessToken) {
    // A token with no refresh token cannot establish a durable session.
    return {
      kind: 'error',
      errorCode: 'missing_refresh_token',
      message: 'That link was incomplete. Request a new one.',
    }
  }
  if (code) return { kind: 'pkce', code }
  // A GoTrue redirect we do not recognise. The URL is already cleaned, which is
  // the part that matters; claiming a specific failure would be a guess.
  return NONE
}
