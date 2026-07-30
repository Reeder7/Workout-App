# Supabase setup

Two files, two different destinations in the dashboard. They are not
interchangeable — pasting one where the other belongs produces a confusing error.

| File | Goes in | What it does |
|---|---|---|
| `schema.sql` | **SQL Editor** | Tables, RLS policies, storage bucket, grants. Idempotent, safe to re-run. |
| `email-template.html` | **Authentication → Emails**, message body | The sign-in email. It is HTML — the SQL Editor will reject it with `syntax error at or near "<!"`. |

## Order

1. **SQL Editor** → paste `schema.sql` → Run. "Success. No rows returned" is the
   expected result: `create` and `grant` statements do not return rows.
2. **Authentication → Emails** → paste `email-template.html` into the message body
   of **both** "Magic link or OTP" **and** "Confirm sign up". Both, because the
   docs do not say which template a brand-new address receives, and every invited
   friend is a brand-new address.
3. **Authentication → Emails → SMTP** → configure custom SMTP. Not optional:
   Supabase's built-in sender delivers only to the project's own team members, so
   until this is done every friend's sign-up fails with
   `Email address not authorized`. It is also capped at 2 emails/hour.
4. Sign in through the app once so a profile row exists, then in the **SQL Editor**:

   ```sql
   update public.profiles
   set status = 'approved', is_admin = true, reviewed_at = now()
   where email = 'your@email.com';
   ```

   Until this runs, nothing is approved and the feed is empty for everyone,
   including you. That is the intended fail-closed state.

## Leave alone

**Authentication → URL Configuration** is already correct. The Site URL and the
redirect allowlist were verified against the live auth endpoint; changing them
risks breaking a path that works. Never put a `#` in either — GoTrue concatenates
`redirectURL + "#" + params`, which produces a URL the app cannot parse.

## Keys

The project URL and the `sb_publishable_` key are committed in
`src/lib/supabase.ts` on purpose: this is a static site, so anything the browser
needs is public by construction, and Supabase documents the publishable key as
safe to expose. Row Level Security is the actual control, and it lives in
`schema.sql`.

The key starting `sb_secret_` must never appear in this repo. It bypasses RLS
entirely.
