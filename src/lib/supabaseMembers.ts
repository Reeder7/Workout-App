import { getSupabase } from './supabase'
import type { MemberSource } from './members'
import type { MemberProfile, MemberStatus } from '../types'

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

function toProfile(r: ProfileRow): MemberProfile {
  return {
    id: r.id,
    email: r.email ?? undefined,
    displayName: r.display_name,
    age: r.age ?? undefined,
    heightCm: r.height_cm ?? undefined,
    weightKg: r.weight_kg ?? undefined,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
  }
}

/**
 * Member list backed by Supabase.
 *
 * A non-admin gets only their own row back — that is the profiles RLS policy
 * working, not an error — so the approval screen is effectively admin-only
 * without needing its own permission check.
 */
export const supabaseMembers: MemberSource = {
  connected: true,

  async list(): Promise<MemberProfile[]> {
    const sb = await getSupabase()
    const { data, error } = await sb
      .from('profiles')
      .select('id,email,display_name,age,height_cm,weight_kg,status,created_at,reviewed_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as ProfileRow[]).map(toProfile)
  },

  async setStatus(id: string, status: MemberStatus): Promise<void> {
    // Routed through an RPC rather than an update: granting the status column to
    // authenticated users would let anyone approve themselves. The function
    // checks the caller is an admin.
    const sb = await getSupabase()
    const { error } = await sb.rpc('set_member_status', {
      member_id: id,
      new_status: status,
    })
    if (error) throw new Error(error.message)
  },
}
