-- ============================================================================
-- Spotter — join with an access code instead of an email
--
-- Paste into the SQL Editor and run, AFTER schema.sql. Idempotent.
--
-- Why: Supabase's built-in mailer only delivers to project team members, so
-- email sign-up cannot work for anyone else without custom SMTP. An access code
-- needs no email, no SMTP, no rate limit, and no browser handoff.
--
-- How it works
--   1. The app signs the visitor in anonymously (a real auth user, no email).
--   2. It calls join_with_code() with the code and their details.
--   3. That function checks the code and creates their profile as 'pending'.
--   4. You approve them, exactly as before.
--
-- The code is verified only AFTER anonymous sign-in, on purpose. Anonymous
-- sign-ins are IP rate-limited by GoTrue (30/hour by default), so guessing has
-- to get past that first. A pre-auth checker callable by `anon` would have had
-- no such ceiling.
-- ============================================================================

-- Anonymous users have no email address.
alter table public.profiles alter column email drop not null;

-- --------------------------------------------------------------- config store
create table if not exists public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- No policies are defined on purpose. RLS on with zero policies denies everyone,
-- so the access code is reachable only through the security definer functions
-- below — never over the REST API, with any key.
alter table public.app_config enable row level security;

-- ------------------------------------------------------------- set / rotate it
create or replace function public.set_invite_code(new_code text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if length(btrim(new_code)) < 6 then
    raise exception 'Use at least 6 characters' using errcode = '22023';
  end if;
  insert into public.app_config (key, value, updated_at)
  values ('invite_code', extensions.crypt(btrim(new_code), extensions.gen_salt('bf')), now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end $$;

-- ------------------------------------------------------------------- join flow
create or replace function public.join_with_code(
  code         text,
  display_name text,
  age          int default null,
  height_cm    numeric default null,
  weight_kg    numeric default null
)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  uid    uuid := auth.uid();
  stored text;
  cur    text;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select value into stored from public.app_config where key = 'invite_code';
  if stored is null then
    raise exception 'No access code has been set yet' using errcode = '22023';
  end if;
  -- Compared against a bcrypt hash, so a database dump never reveals the code.
  if extensions.crypt(btrim(code), stored) <> stored then
    raise exception 'That access code is not right' using errcode = '42501';
  end if;

  if length(btrim(display_name)) < 1 then
    raise exception 'A name is required' using errcode = '22023';
  end if;

  select status into cur from public.profiles where id = uid;

  if cur is null then
    -- The insert trigger forces status 'pending' and is_admin false, so nothing
    -- here can grant itself anything.
    insert into public.profiles (id, email, display_name, age, height_cm, weight_kg)
    values (uid, null, btrim(display_name), age, height_cm, weight_kg);
    return 'pending';
  end if;

  -- Re-submitting edits the details and never touches status or is_admin, so a
  -- rejected member cannot re-join by sending the form again.
  update public.profiles
     set display_name = btrim(display_name),
         age = join_with_code.age,
         height_cm = join_with_code.height_cm,
         weight_kg = join_with_code.weight_kg
   where id = uid;
  return cur;
end $$;

-- --------------------------------------------------------------------- grants
grant execute on function public.set_invite_code(text) to authenticated;
grant execute on function public.join_with_code(text, text, int, numeric, numeric)
  to authenticated;

-- ============================================================================
-- SET THE FIRST CODE
--
-- set_invite_code() checks that the caller is an admin, and in the SQL Editor
-- there is no caller, so bootstrap it with plain SQL. Run this as a second
-- statement, after changing the code:
--
--   -- Set (or change) the access code. Pick your own; 6 characters minimum.
--   -- `set search_path` makes the unqualified crypt() resolve wherever pgcrypto
--   -- lives, so this works whether it sits in `extensions` or `public`.
--   set search_path = public, extensions;
--
--   insert into public.app_config (key, value)
--   values ('invite_code', crypt('CHANGE-THIS-CODE', gen_salt('bf')))
--   on conflict (key) do update set value = excluded.value, updated_at = now();
--
--   -- Confirm it stored a bcrypt hash. Should print one row whose preview starts
--   -- with $2a$ or $2b$ — the code itself is never recoverable from this.
--   select key, left(value, 7) || '...' as hash_preview, updated_at
--   from public.app_config where key = 'invite_code';
--
-- Pick something not guessable. A wrong code costs an attacker one anonymous
-- sign-in against a 30-per-hour IP limit, but a short code is still a short code.
-- Note this direct insert skips set_invite_code's own length check.
--
-- ALSO REQUIRED, one toggle:
--   Authentication → Providers → enable "Anonymous sign-ins".
--   Without it every join fails with "Anonymous sign-ins are disabled".
-- ============================================================================
