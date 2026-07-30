/**
 * Supabase's built-in email sender allows 2 emails per hour, project-wide, and
 * that ceiling cannot be raised without custom SMTP. Burning it on accidental
 * double-taps costs an hour of waiting, so the send button enforces its own
 * cooldown — persisted, because a reload would otherwise reset it.
 */
const COOLDOWN_KEY = 'spotter-last-otp-send'
/** Matches GoTrue's own per-user window. */
export const SEND_COOLDOWN_SEC = 60

export function markSent() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    /* storage unavailable: fall back to no cooldown rather than blocking sign-in */
  }
}

/** Seconds still to wait, or 0 if a send is allowed. */
export function cooldownRemaining(now = Date.now()): number {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY))
    if (!Number.isFinite(last) || last <= 0) return 0
    const elapsed = Math.floor((now - last) / 1000)
    // A clock that moved backwards should not lock the button forever.
    if (elapsed < 0) return 0
    return Math.max(0, SEND_COOLDOWN_SEC - elapsed)
  } catch {
    return 0
  }
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
