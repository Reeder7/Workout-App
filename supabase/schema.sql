-- ============================================================================
-- Spotter — social layer schema
--
-- Paste this whole file into the Supabase dashboard SQL Editor and run it.
-- It is idempotent: running it twice is safe.
--
-- Design rules this encodes:
--   * Nobody sees anything until an admin approves them.
--   * A post cannot exist without a photo (the pairing rule is a NOT NULL,
--     not a UI convention).
--   * You only see the feed on a day you have posted (the gate is enforced in
--     RLS, so it cannot be bypassed by calling the API directly).
--   * Other members see your display name only. Age, height and weight are
--     visible to you and to an admin, nobody else.
--   * Posts expire after 30 days.
-- ============================================================================

-- ----------------------------------------------------------------- extensions
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------- timezone
-- The daily gate needs a calendar day, and "today" is a local idea. One
-- constant for the whole group is correct while everyone is in one timezone.
-- Change this single line if that stops being true.
create or replace function public.group_timezone()
returns text language sql immutable as $$ select 'America/New_York' $$;

create or replace function public.group_today()
returns date language sql stable as $$
  select (now() at time zone public.group_timezone())::date
$$;

-- ================================================================== profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 40),
  age         int  check (age between 13 and 100),
  height_cm   numeric(5, 1) check (height_cm between 100 and 250),
  weight_kg   numeric(5, 1) check (weight_kg between 30 and 300),
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- A new signup must never be able to approve itself or grant itself admin,
-- whatever it sends in the insert. Enforced in a trigger rather than trusted
-- from the client.
create or replace function public.force_pending_on_insert()
returns trigger language plpgsql as $$
begin
  new.status := 'pending';
  new.is_admin := false;
  new.created_at := now();
  new.reviewed_at := null;
  return new;
end $$;

drop trigger if exists profiles_force_pending on public.profiles;
create trigger profiles_force_pending
  before insert on public.profiles
  for each row execute function public.force_pending_on_insert();

-- Reading profiles from inside a profiles policy would recurse. security
-- definer breaks the cycle by running as the owner, bypassing RLS.
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = uid), false)
$$;

create or replace function public.is_approved(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from public.profiles where id = uid), false)
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin(auth.uid()));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin(auth.uid())) with check (true);

-- ------------------------------------------------- admin: change a status
-- Deliberately NOT a column grant. `grant update (status) ... to authenticated`
-- applies to every signed-in user, and combined with the update-own-row policy
-- it would let any member approve themselves. A security definer function can
-- check who is calling; a grant cannot.
create or replace function public.set_member_status(member_id uuid, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid status: %', new_status using errcode = '22023';
  end if;
  update public.profiles
     set status = new_status, reviewed_at = now()
   where id = member_id;
end $$;

-- ------------------------------------------------------- what members can see
-- RLS filters rows, not columns, so the narrow view is how other members get a
-- display name without also getting an email and a bodyweight.
--
-- security_invoker is deliberately OFF: the view runs with its owner's rights so
-- it can see past the profiles policies (which only expose your own row), and
-- the WHERE clause below is what restricts it — the viewer must be approved, and
-- only approved members are listed. With security_invoker on, this view would
-- return nothing but your own row.
create or replace view public.members_public
with (security_invoker = false) as
  select p.id, p.display_name
  from public.profiles p
  where p.status = 'approved'
    and public.is_approved(auth.uid());

-- ===================================================================== posts
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  author       uuid not null references public.profiles (id) on delete cascade,
  workout_name text not null,
  -- The pairing rule: no card without a photo, enforced by the column.
  photo_path   text not null,
  -- The card is re-rendered on each viewer's device from this, rather than
  -- uploading a second image. Halves storage and follows the viewer's theme.
  summary      jsonb not null,
  posted_on    date not null default public.group_today(),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '30 days')
);

create index if not exists posts_feed_idx on public.posts (posted_on desc, created_at desc);
create index if not exists posts_author_day_idx on public.posts (author, posted_on);
create index if not exists posts_expiry_idx on public.posts (expires_at);

-- The gate. Bypassing this would mean bypassing Postgres.
create or replace function public.posted_today(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts
    where author = uid and posted_on = public.group_today()
  )
$$;

alter table public.posts enable row level security;

drop policy if exists posts_select_gated on public.posts;
create policy posts_select_gated on public.posts
  for select using (
    public.is_approved(auth.uid())
    -- A revoked member's existing posts disappear too, not just their access.
    and public.is_approved(author)
    and expires_at > now()
    -- Your own posts are always visible; everyone else's need today's photo.
    and (author = auth.uid() or public.posted_today(auth.uid()))
  );

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert with check (author = auth.uid() and public.is_approved(auth.uid()));

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete using (author = auth.uid() or public.is_admin(auth.uid()));

-- =================================================================== storage
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', false)
on conflict (id) do nothing;

-- Photos are served through short-lived signed URLs, so the bucket stays
-- private and a leaked path is worthless on its own.
drop policy if exists photos_insert_own on storage.objects;
create policy photos_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-photos'
    and public.is_approved(auth.uid())
    -- First path segment is the uploader's id, so nobody can write into
    -- somebody else's folder.
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_select_gated on storage.objects;
create policy photos_select_gated on storage.objects
  for select to authenticated using (
    bucket_id = 'post-photos'
    and public.is_approved(auth.uid())
    and ((storage.foldername(name))[1] = auth.uid()::text or public.posted_today(auth.uid()))
  );

drop policy if exists photos_delete_own on storage.objects;
create policy photos_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid()))
  );

-- ==================================================================== grants
-- "Automatically expose new tables" is off, so privileges are explicit. RLS
-- still decides which rows; these only decide which tables are reachable.
grant usage on schema public to anon, authenticated;

grant select, insert on public.profiles to authenticated;
-- Column-level update: a member can edit their own details but cannot touch
-- status or is_admin even on their own row.
grant update (display_name, age, height_cm, weight_kg) on public.profiles to authenticated;
grant select on public.members_public to authenticated;
grant select, insert, delete on public.posts to authenticated;

grant execute on function public.group_today() to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_approved(uuid) to authenticated;
grant execute on function public.posted_today(uuid) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;

-- ============================================================================
-- LAST STEP — make yourself the admin.
--
-- Sign in through the app once so a row exists, then run:
--
--   update public.profiles
--   set status = 'approved', is_admin = true, reviewed_at = now()
--   where email = 'your@email.com';
--
-- Until you do this, nothing is approved and the feed is empty for everyone,
-- including you. That is the intended fail-closed state.
-- ============================================================================
