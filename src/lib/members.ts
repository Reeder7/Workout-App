import type { MemberProfile } from '../types'

/**
 * Data source for the member list.
 *
 * Deliberately an interface rather than direct Supabase calls: the backend
 * isn't provisioned yet, and this keeps the approval screen buildable and
 * reviewable now. Swapping in the Supabase implementation later means writing
 * one adapter, not editing the screen.
 */
export interface MemberSource {
  /** False until a backend is configured, which the UI reports honestly. */
  connected: boolean
  list(): Promise<MemberProfile[]>
  setStatus(id: string, status: MemberProfile['status']): Promise<void>
}

const notConnected: MemberSource = {
  connected: false,
  async list() {
    return []
  },
  async setStatus() {
    throw new Error('No backend is connected yet')
  },
}

let source: MemberSource = notConnected

/** Called once at startup when a backend is available. */
export function setMemberSource(next: MemberSource) {
  source = next
}

export function memberSource(): MemberSource {
  return source
}

/* --------------------------------------------------------------- formatting */

export function heightLabel(cm: number | undefined, unit: 'lb' | 'kg'): string | null {
  if (!cm) return null
  if (unit === 'kg') return `${Math.round(cm)} cm`
  const inches = cm / 2.54
  return `${Math.floor(inches / 12)}′${Math.round(inches % 12)}″`
}

export function weightLabel(kg: number | undefined, unit: 'lb' | 'kg'): string | null {
  if (!kg) return null
  return unit === 'kg' ? `${Math.round(kg)} kg` : `${Math.round(kg * 2.2046)} lb`
}

/** "Reed · 28 · 5′11″ · 185 lb", skipping anything not supplied. */
export function memberSummary(m: MemberProfile, unit: 'lb' | 'kg'): string {
  return [m.age ? `${m.age}` : null, heightLabel(m.heightCm, unit), weightLabel(m.weightKg, unit)]
    .filter(Boolean)
    .join(' · ')
}
