# Supabase setup

Three files with different destinations in the dashboard. They are not
interchangeable — pasting one where the other belongs produces a confusing error.

| File | Goes in | What it does |
|---|---|---|
| `schema.sql` | **SQL Editor** | Tables, RLS policies, storage bucket, grants. Idempotent, safe to re-run. |
| `02-access-code.sql` | **SQL Editor**, after `schema.sql` | Join with an access code instead of an email. This is the path to use. |
| `email-template.html` | **Authentication → Emails**, message body | Only needed for the email fallback. It is HTML — the SQL Editor will reject it with `syntax error at or near "<!"`. |

## Order — access code route (recommended)

Four steps, no email involved.

1. **SQL Editor** → paste `schema.sql` → Run. "Success. No rows returned" is the
   expected result: `create` and `grant` statements do not return rows.
2. **SQL Editor** → paste `02-access-code.sql` → Run.
3. **Authentication → Providers** → enable **Anonymous sign-ins**. Without it every
   join fails with "Anonymous sign-ins are disabled".
4. **SQL Editor** → set the code, choosing your own:

   ```sql
   insert into public.app_config (key, value)
   values ('invite_code', extensions.crypt('your-code-here', extensions.gen_salt('bf')))
   on conflict (key) do update set value = excluded.value, updated_at = now();
   ```

Then join through the app yourself, and in the **SQL Editor** make yourself the
admin. Match on the name you entered — a code-joined profile has **no email**, so
matching on one finds nothing:

   ```sql
   update public.profiles
   set status = 'approved', is_admin = true, reviewed_at = now()
   where display_name = 'Reed';
   ```

If you are not sure which row is yours, list them first:

   ```sql
   select id, display_name, email, status, created_at
   from public.profiles
   order by created_at desc;
   ```

Until that runs, nothing is approved and the feed is empty for everyone,
including you. That is the intended fail-closed state.

Give friends the access code by text. They enter it with a name, and appear in
**Settings → Approve members**.

## Email route (optional fallback)

Only worth setting up for account recovery — an access-code account cannot be
recovered if the device is lost. It needs two extra things:

- `email-template.html` pasted into the message body of **both** "Magic link or
  OTP" **and** "Confirm sign up". Both, because the docs do not say which template
  a brand-new address receives.
- **Custom SMTP.** Supabase's built-in sender delivers only to the project's own
  team members — every friend's attempt fails with `Email address not authorized` —
  and is capped at 2 emails/hour. Brevo's free tier works without owning a domain;
  most others require one.

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
