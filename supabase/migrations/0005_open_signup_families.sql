-- 0005: open signup + one-admin families + common recipe pool
--
-- Model: anyone with the app URL can create an account. A new user either
--   (a) creates their own family (becomes its single admin), or
--   (b) joins an existing family through that family's invite link (member).
-- Recipes are ALWAYS in the common pool; menus stay per family.

-- ---------------------------------------------------------------------
-- 1. Hard guarantees: one family per user, one admin per family
-- ---------------------------------------------------------------------
create unique index if not exists family_members_one_family_per_user
  on public.family_members (user_id);

create unique index if not exists family_members_one_admin_per_family
  on public.family_members (family_id) where role = 'admin';

-- ---------------------------------------------------------------------
-- 2. One reusable invite link per family (admin can reset it)
-- ---------------------------------------------------------------------
create table if not exists public.family_invites (
  family_id  uuid primary key references public.families(id) on delete cascade,
  token      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.family_invites enable row level security;

create policy "family_invites_admin_select" on public.family_invites
  for select using (public.is_family_admin(family_id));
create policy "family_invites_admin_insert" on public.family_invites
  for insert with check (public.is_family_admin(family_id));
create policy "family_invites_admin_update" on public.family_invites
  for update using (public.is_family_admin(family_id))
  with check (public.is_family_admin(family_id));

-- Existing family gets its link row too.
insert into public.family_invites (family_id)
select id from public.families
on conflict (family_id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Families can only be created through this function.
--    (Direct inserts used to let any user add themselves to ANY family.)
-- ---------------------------------------------------------------------
create or replace function public.create_family(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;
  if coalesce(trim(family_name), '') = '' then
    raise exception 'Family name is required.';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    raise exception 'You already belong to a family.';
  end if;

  insert into public.families (name, created_by)
  values (trim(family_name), uid)
  returning id into fid;

  insert into public.family_members (family_id, user_id, role)
  values (fid, uid, 'admin');

  insert into public.family_invites (family_id) values (fid);

  return fid;
end;
$$;

revoke all on function public.create_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;

-- Joining a family happens server-side (service role) after the invite token
-- is checked, so clients get no direct insert path any more.
drop policy if exists "families_insert_self" on public.families;
drop policy if exists "family_members_insert_self" on public.family_members;

-- ---------------------------------------------------------------------
-- 4. Common recipe pool: every recipe is public, no toggle
-- ---------------------------------------------------------------------
alter table public.recipes alter column visibility set default 'public';
update public.recipes set visibility = 'public' where visibility <> 'public';

create or replace function public.force_recipe_public()
returns trigger
language plpgsql
as $$
begin
  new.visibility := 'public';
  return new;
end;
$$;

drop trigger if exists recipes_force_public on public.recipes;
create trigger recipes_force_public
  before insert or update on public.recipes
  for each row execute function public.force_recipe_public();

drop policy if exists "recipes_select_visible" on public.recipes;
create policy "recipes_select_all_members" on public.recipes
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 5. Strangers can now sign up, so other users' email addresses must not
--    be readable. The app only reads name / avatar from public.users;
--    a user's own email comes from their auth session.
-- ---------------------------------------------------------------------
revoke select on public.users from anon, authenticated;
grant select (
  id, name, profile_photo_url, avatar_url, cooks_per_week, who_cooks,
  dietary_prefs, fav_cuisines, signature_dish, chat_enabled, invited_by, created_at
) on public.users to authenticated;
