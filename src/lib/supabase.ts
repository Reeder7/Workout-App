import type { SupabaseClient } from '@supabase/supabase-js'

/*
 * These two values are committed on purpose.
 *
 * This is a static site with no server, so anything the browser needs is in the
 * bundle by definition — a build secret would be theatre. The publishable key is
 * designed for exactly this: Supabase documents it as safe to expose in web
 * pages and source code. Row Level Security is what actually protects the data,
 * and those policies live in supabase/schema.sql.
 *
 * The key that must never appear here is the one starting `sb_secret_`, which
 * bypasses RLS entirely.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://izvypbhbzugzgtnsqyjz.supabase.co'
const KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_uKGCkHgUSLRwKQQEfWBmyg_BYrQXaSn'

export const isConfigured = Boolean(URL && KEY)

let pending: Promise<SupabaseClient> | null = null

/**
 * The SDK is imported dynamically because it roughly doubles the bundle, and
 * none of it is needed to log a workout — which is what the app is for. It
 * loads the first time something social happens.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!pending) {
    pending = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL, KEY, {
        auth: {
          /*
           * PKCE puts the auth code in a query parameter. The default implicit
           * flow returns tokens in the URL hash, which this app already uses
           * for routing — the two collide and sign-in silently does nothing.
           */
          flowType: 'pkce',
          /*
           * Off on purpose. The SDK is imported lazily, so by the time it could
           * read the URL, takeAuthCallback() has already consumed and cleared it
           * — it has to, because HashRouter would otherwise treat the token
           * fragment as a route and render nothing. Callbacks are handed to the
           * SDK explicitly in lib/auth.ts instead.
           */
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      }),
    )
  }
  return pending
}

/** Where magic links come back to. Must be in the dashboard's Redirect URLs. */
export function authRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}
