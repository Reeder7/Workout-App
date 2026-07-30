/**
 * Supabase's built-in email sender allows 2 emails per hour, project-wide, and
 * that ceiling cannot be raised without custom SMTP. Burning it on accidental
 * double-taps costs an hour of waiting, so the send button enforces its own
 * cooldown — persisted, because a reload would otherwise reset it.
 */
const COOLDOWN_KEY = 'spotter-last-otp-send'
const UNTIL_KEY = 'spotter-otp-cooldown-until'
/** Matches GoTrue's own per-user window. */
export const SEND_COOLDOWN_SEC = 60
/*
 * After a 2-per-hour rejection, re-enabling in 60s invites a retry that is
 * guaranteed to fail for the rest of the hour. Slightly over an hour, so the
 * window has genuinely rolled over by the time the button comes back.
 */
export const RATE_LIMIT_COOLDOWN_SEC = 65 * 60

export function markSent(seconds = SEND_COOLDOWN_SEC) {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    localStorage.setItem(UNTIL_KEY, String(Date.now() + seconds * 1000))
  } catch {
    /* storage unavailable: fall back to no cooldown rather than blocking sign-in */
  }
}

/** Seconds still to wait, or 0 if a send is allowed. */
export function cooldownRemaining(now = Date.now()): number {
  try {
    const until = Number(localStorage.getItem(UNTIL_KEY))
    if (Number.isFinite(until) && until > 0) {
      // A clock that moved backwards must not lock the button for hours, so the
      // wait can never exceed the longest cooldown we ever set.
      const left = Math.ceil((until - now) / 1000)
      return Math.max(0, Math.min(left, RATE_LIMIT_COOLDOWN_SEC))
    }
    const last = Number(localStorage.getItem(COOLDOWN_KEY))
    if (!Number.isFinite(last) || last <= 0) return 0
    const elapsed = Math.floor((now - last) / 1000)
    if (elapsed < 0) return 0
    return Math.max(0, SEND_COOLDOWN_SEC - elapsed)
  } catch {
    return 0
  }
}

/** True when a message is GoTrue's project-wide email throttle. */
export function isRateLimit(raw: string): boolean {
  const m = raw.toLowerCase()
  return m.includes('rate limit') || m.includes('too many requests')
}

/** "1h 5m" / "4m" / "35s" — a countdown nobody has to decode. */
export function fmtWait(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.round((seconds % 3600) / 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`
  return `${seconds}s`
}

/**
 * Turns a GoTrue error into something worth reading. The raw messages leak
 * implementation detail — one of them recommends @supabase/ssr to a user who has
 * no server — so nothing is passed through untranslated.
 */
export function explainAuthError(raw: string): string {
  const m = raw.toLowerCase()

  if (m.includes('rate limit') || m.includes('too many requests')) {
    return "Supabase's built-in email sender only allows 2 messages an hour, and that limit is shared across everyone using the app. Wait an hour and try again, or set up custom SMTP to lift it."
  }
  if (m.includes('code verifier') || m.includes('flow_state')) {
    return 'That link was opened in a different browser from the one that requested it. Use the 6-digit code from the email instead — it works from anywhere.'
  }
  if (m.includes('you can only request this after') || m.includes('security purposes')) {
    return 'A code was just sent. Wait a moment before asking for another.'
  }
  if (m.includes('access code is not right')) {
    return "That access code isn't right. Check it with whoever invited you."
  }
  if (m.includes('no access code has been set')) {
    return 'No access code has been set up yet. Ask the admin to set one.'
  }
  if (m.includes('anonymous sign-ins are disabled') || m.includes('anonymous_provider_disabled')) {
    return 'Joining by code is turned off for this project. Enable anonymous sign-ins in the Supabase dashboard.'
  }
  if (m.includes('a name is required')) {
    return 'Enter the name your friends will see.'
  }
  if (m.includes('not authorized')) {
    return "Supabase's built-in email sender only delivers to the project's own team members. Set up custom SMTP before inviting anyone else."
  }
  if (m.includes('expired') || m.includes('invalid') || m.includes('token has expired')) {
    return 'That code is wrong or has expired. Request a new one.'
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'New sign-ups are turned off for this project.'
  }
  if (m.includes('email address') && m.includes('invalid')) {
    return "That email address wasn't accepted. Check it for typos."
  }
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('took too long')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (m.includes('user not found')) {
    return 'No account for that address yet — sending a code will create one.'
  }
  return raw
}
