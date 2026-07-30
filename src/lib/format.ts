export function fmtWeight(w: number): string {
  if (!w) return '0'
  return Number.isInteger(w) ? String(w) : w.toFixed(1)
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diff / day)
  if (days <= 0) {
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    return ts >= startOfToday.getTime() ? 'Today' : 'Yesterday'
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function fmtDuration(sec?: number): string {
  if (!sec) return '—'
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
