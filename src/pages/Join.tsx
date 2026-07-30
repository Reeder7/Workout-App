import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { isConfigured } from '../lib/supabase'
import { refreshProfile, saveMyProfile, signInWithEmail, signOut, useAuth } from '../lib/auth'
import { toast } from '../lib/toast'

/** Imperial entry converted to the canonical cm/kg the database stores. */
const toCm = (ft: string, inch: string) => {
  const f = parseFloat(ft)
  const i = parseFloat(inch) || 0
  return f > 0 ? Math.round((f * 12 + i) * 2.54 * 10) / 10 : undefined
}
const fromCm = (cm?: number) => {
  if (!cm) return { ft: '', inch: '' }
  const total = cm / 2.54
  return { ft: String(Math.floor(total / 12)), inch: String(Math.round(total % 12)) }
}
const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function Join() {
  const nav = useNavigate()
  const unit = useStore((s) => s.settings.unit)
  const { loading, userId, email, profile, error } = useAuth()
  const imperial = unit === 'lb'

  const [addr, setAddr] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [ft, setFt] = useState('')
  const [inch, setInch] = useState('')
  const [cm, setCm] = useState('')
  const [wt, setWt] = useState('')

  // Seed the form from an existing profile once it arrives.
  useEffect(() => {
    if (!profile) return
    setName(profile.displayName)
    setAge(profile.age ? String(profile.age) : '')
    setWt(
      profile.weightKg
        ? String(imperial ? Math.round(profile.weightKg * 2.2046) : Math.round(profile.weightKg))
        : '',
    )
    const h = fromCm(profile.heightCm)
    setFt(h.ft)
    setInch(h.inch)
    setCm(profile.heightCm ? String(Math.round(profile.heightCm)) : '')
  }, [profile, imperial])

  if (!isConfigured) {
    return (
      <div className="app">
        <PageHeader title="Join" onBack={() => nav('/settings')} />
        <EmptyState glyph="search" title="No backend connected" />
      </div>
    )
  }

  async function send() {
    if (!addr.includes('@')) {
      toast('That does not look like an email address', 'danger')
      return
    }
    setBusy(true)
    try {
      await signInWithEmail(addr)
      setSent(true)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not send the link', 'danger')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!name.trim()) {
      toast('A name is required', 'danger')
      return
    }
    setBusy(true)
    try {
      await saveMyProfile({
        displayName: name,
        age: num(age),
        heightCm: imperial ? toCm(ft, inch) : num(cm),
        weightKg: num(wt) ? (imperial ? Math.round((num(wt)! / 2.2046) * 10) / 10 : num(wt)) : undefined,
      })
      toast('Sent for approval', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save that', 'danger')
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------- signed out */
  if (loading) {
    return (
      <div className="app">
        <PageHeader title="Join" onBack={() => nav('/settings')} />
        <p className="hint">Checking your session…</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="app">
        <PageHeader
          eyebrow="Spotter social"
          title="Sign in"
          sub="One-time link by email. No password to remember or lose."
          onBack={() => nav('/settings')}
        />
        {error && (
          <div className="card" style={{ marginBottom: 'var(--space-3)', boxShadow: 'var(--card-shadow), inset 3px 0 0 var(--danger)' }}>
            <div style={{ fontWeight: 640, fontSize: 15 }}>That link didn't work</div>
            <p className="hint" style={{ marginBottom: 0, marginTop: 4 }}>
              {error}
            </p>
          </div>
        )}
        {sent ? (
          <EmptyState
            glyph="note"
            title="Check your email"
            body={`A sign-in link is on its way to ${addr}. Open it on this phone — the link signs in the browser that opens it.`}
          >
            <button className="btn btn-ghost" onClick={() => setSent(false)}>
              Use a different address
            </button>
          </EmptyState>
        ) : (
          <div className="card">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
            />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 'var(--space-3)' }}
              disabled={busy}
              onClick={send}
            >
              {busy ? 'Sending…' : 'Send me a link'}
            </button>
            <p className="hint" style={{ marginBottom: 0, marginTop: 'var(--space-3)' }}>
              Your training data stays on this device either way. Signing in is only for the
              shared feed.
            </p>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------ signed in, needs review */
  if (profile && profile.status !== 'pending') {
    const approved = profile.status === 'approved'
    return (
      <div className="app">
        <PageHeader eyebrow="Spotter social" title={approved ? "You're in" : 'Not approved'} onBack={() => nav('/settings')} />
        <EmptyState
          glyph={approved ? 'people' : 'search'}
          title={approved ? `Signed in as ${profile.displayName}` : 'This account was not approved'}
          body={
            approved
              ? 'Post a gym photo with a workout to unlock the feed for the day.'
              : 'Ask the admin to take another look, or sign out and use a different address.'
          }
        >
          <button className="btn btn-ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </EmptyState>
      </div>
    )
  }

  /* --------------------------------------------- signed in, profile / pending */
  const waiting = profile?.status === 'pending'
  return (
    <div className="app">
      <PageHeader
        eyebrow="Spotter social"
        title={waiting ? 'Waiting for approval' : 'Your details'}
        sub={
          waiting
            ? 'Your details are with the admin. You can still edit them below.'
            : 'Name is required. The rest is optional and only used for strength comparisons.'
        }
        onBack={() => nav('/settings')}
      />

      {error && (
        <p className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div className="card">
        <label className="field-label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          placeholder="What your friends call you"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="field-label" htmlFor="age" style={{ marginTop: 'var(--space-4)' }}>
          Age <span className="faint">— optional</span>
        </label>
        <input
          id="age"
          type="number"
          inputMode="numeric"
          min="13"
          max="100"
          placeholder="—"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 'var(--space-4)' }}>
          Height <span className="faint">— optional</span>
        </label>
        {imperial ? (
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <input
              aria-label="Height, feet"
              type="number"
              inputMode="numeric"
              placeholder="ft"
              value={ft}
              onChange={(e) => setFt(e.target.value)}
            />
            <input
              aria-label="Height, inches"
              type="number"
              inputMode="numeric"
              placeholder="in"
              value={inch}
              onChange={(e) => setInch(e.target.value)}
            />
          </div>
        ) : (
          <input
            aria-label="Height in centimetres"
            type="number"
            inputMode="numeric"
            placeholder="cm"
            value={cm}
            onChange={(e) => setCm(e.target.value)}
          />
        )}

        <label className="field-label" htmlFor="wt" style={{ marginTop: 'var(--space-4)' }}>
          Bodyweight <span className="faint">— optional</span>
        </label>
        <input
          id="wt"
          type="number"
          inputMode="decimal"
          placeholder={unit}
          value={wt}
          onChange={(e) => setWt(e.target.value)}
        />

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 'var(--space-4)' }}
          disabled={busy}
          onClick={save}
        >
          <Icon name="check" size={18} /> {waiting ? 'Save changes' : 'Send for approval'}
        </button>
      </div>

      <div className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <button className="btn btn-ghost grow" onClick={() => void refreshProfile()}>
          Check status
        </button>
        <button className="btn btn-ghost grow" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <p className="hint" style={{ marginTop: 'var(--space-3)' }}>
        Signed in as {email}. Only you and the admin can see your age, height and bodyweight —
        other members see your name.
      </p>
    </div>
  )
}
