-- Memory Kitchen — Session 1 initial schema
-- 16 tables per memory_kitchen_datamodel.html, plus RLS enablement and policies.
-- Run in the Supabase SQL editor for project peach-a-table (ref: ntfppnyzzhihxhzsewlz).

create extension if not exists pgcrypto;

-- =========================================================
-- USERS  (public.users.id == auth.users.id, set explicitly on signup)
-- =========================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  profile_photo_url text,
  cooks_per_week int,
  who_cooks text,
  dietary_prefs text[] default '{}',
  fav_cuisines text[] default '{}',
  signature_dish text,
  chat_enabled boolean default false,
  subscription_status text default 'free' check (subscription_status in ('free','paid')),
  is_comped boolean default false,
  invited_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- =========================================================
-- FAMILIES
-- =========================================================
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.family_members (
  family_id uuid references public.families(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text default 'member' check (role in ('admin','member')),
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

-- =========================================================
-- INVITES (invite-only network enforcement)
-- =========================================================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid references public.users(id) on delete cascade,
  email text,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  status text default 'pending' check (status in ('pending','accepted','expired')),
  invites_remaining int default 5,
  created_at timestamptz default now()
);

-- =========================================================
-- FRIENDSHIPS
-- =========================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  friend_id uuid references public.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

-- =========================================================
-- RECIPES + PHOTOS + SAVES
-- =========================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade,
  name text not null,
  story text,
  ingredients text,
  source_url text,
  meal_category text,
  cuisine_tags text[] default '{}',
  dietary_tags text[] default '{}',
  visibility text default 'private' check (visibility in ('public','friends','private')),
  save_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade,
  storage_path text not null,
  photo_type text check (photo_type in ('dish','handwritten','screenshot')),
  is_hero boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.saved_recipes (
  user_id uuid references public.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  saved_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

-- =========================================================
-- MENU PLANNING (family-scoped, weekly)
-- =========================================================
create table if not exists public.menu_weeks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  week_start date not null,
  status text default 'active' check (status in ('active','archived')),
  unique (family_id, week_start)
);

create table if not exists public.menu_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references public.menu_weeks(id) on delete cascade,
  day_date date not null,
  meal_type text not null,
  unique (week_id, day_date, meal_type)
);

create table if not exists public.menu_dishes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.menu_slots(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  free_text text,
  sort_order int default 0,
  check (recipe_id is not null or free_text is not null)
);

-- =========================================================
-- COMMENTS
-- =========================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- =========================================================
-- CHAT
-- =========================================================
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  is_group boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.chat_participants (
  thread_id uuid references public.chat_threads(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  sender_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- =========================================================
-- EVENTS
-- =========================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade,
  name text not null,
  event_date date,
  description text,
  visibility text default 'network' check (visibility in ('network','link-only')),
  invite_token text unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  guest_name text,
  guest_email text,
  joined_at timestamptz default now()
);

create table if not exists public.event_dishes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  claimed_by uuid references public.users(id) on delete set null,
  guest_name text,
  recipe_id uuid references public.recipes(id) on delete set null,
  free_text text,
  category text check (category in ('starter','main','dessert','drinks','other')),
  claimed_at timestamptz
);

-- =========================================================
-- INDEXES
-- =========================================================
create index if not exists idx_family_members_user on public.family_members(user_id);
create index if not exists idx_invites_token on public.invites(token);
create index if not exists idx_invites_email on public.invites(email);
create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_recipes_owner on public.recipes(owner_id);
create index if not exists idx_recipes_visibility on public.recipes(visibility);
create index if not exists idx_recipe_photos_recipe on public.recipe_photos(recipe_id);
create index if not exists idx_saved_recipes_recipe on public.saved_recipes(recipe_id);
create index if not exists idx_menu_slots_week on public.menu_slots(week_id);
create index if not exists idx_menu_dishes_slot on public.menu_dishes(slot_id);
create index if not exists idx_comments_recipe on public.comments(recipe_id);
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id);
create index if not exists idx_events_invite_token on public.events(invite_token);
create index if not exists idx_event_participants_event on public.event_participants(event_id);
create index if not exists idx_event_dishes_event on public.event_dishes(event_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invites enable row level security;
alter table public.friendships enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_photos enable row level security;
alter table public.saved_recipes enable row level security;
alter table public.menu_weeks enable row level security;
alter table public.menu_slots enable row level security;
alter table public.menu_dishes enable row level security;
alter table public.comments enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_dishes enable row level security;

-- ---- users ----
create policy "users_select_all_members" on public.users
  for select using (auth.uid() is not null);
create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- families ----
create policy "families_select_member" on public.families
  for select using (
    created_by = auth.uid()
    or id in (select family_id from public.family_members where user_id = auth.uid())
  );
create policy "families_insert_self" on public.families
  for insert with check (created_by = auth.uid());
create policy "families_update_admin" on public.families
  for update using (
    id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin')
  );

-- ---- family_members ----
create policy "family_members_select" on public.family_members
  for select using (
    user_id = auth.uid()
    or family_id in (select family_id from public.family_members where user_id = auth.uid())
  );
create policy "family_members_insert_self" on public.family_members
  for insert with check (user_id = auth.uid());
create policy "family_members_delete_self_or_admin" on public.family_members
  for delete using (
    user_id = auth.uid()
    or family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin')
  );

-- ---- invites ----
create policy "invites_select_own" on public.invites
  for select using (invited_by = auth.uid());
create policy "invites_insert_own" on public.invites
  for insert with check (invited_by = auth.uid());

-- ---- friendships ----
create policy "friendships_select_own" on public.friendships
  for select using (user_id = auth.uid() or friend_id = auth.uid());
create policy "friendships_insert_own" on public.friendships
  for insert with check (user_id = auth.uid());
create policy "friendships_update_own" on public.friendships
  for update using (user_id = auth.uid() or friend_id = auth.uid());

-- ---- recipes ----
create policy "recipes_select_visible" on public.recipes
  for select using (
    visibility = 'public'
    or owner_id = auth.uid()
    or (
      visibility = 'friends'
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = recipes.owner_id)
          or (f.friend_id = auth.uid() and f.user_id = recipes.owner_id)
        )
      )
    )
  );
create policy "recipes_insert_own" on public.recipes
  for insert with check (owner_id = auth.uid());
create policy "recipes_update_own" on public.recipes
  for update using (owner_id = auth.uid());
create policy "recipes_delete_own" on public.recipes
  for delete using (owner_id = auth.uid());

-- ---- recipe_photos ----
create policy "recipe_photos_select_visible" on public.recipe_photos
  for select using (
    recipe_id in (select id from public.recipes)
  );
create policy "recipe_photos_write_own" on public.recipe_photos
  for all using (
    recipe_id in (select id from public.recipes where owner_id = auth.uid())
  ) with check (
    recipe_id in (select id from public.recipes where owner_id = auth.uid())
  );

-- ---- saved_recipes ----
create policy "saved_recipes_own" on public.saved_recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- menu_weeks ----
create policy "menu_weeks_family" on public.menu_weeks
  for all using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  ) with check (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

-- ---- menu_slots ----
create policy "menu_slots_family" on public.menu_slots
  for all using (
    week_id in (
      select mw.id from public.menu_weeks mw
      join public.family_members fm on fm.family_id = mw.family_id
      where fm.user_id = auth.uid()
    )
  ) with check (
    week_id in (
      select mw.id from public.menu_weeks mw
      join public.family_members fm on fm.family_id = mw.family_id
      where fm.user_id = auth.uid()
    )
  );

-- ---- menu_dishes ----
create policy "menu_dishes_family" on public.menu_dishes
  for all using (
    slot_id in (
      select ms.id from public.menu_slots ms
      join public.menu_weeks mw on mw.id = ms.week_id
      join public.family_members fm on fm.family_id = mw.family_id
      where fm.user_id = auth.uid()
    )
  ) with check (
    slot_id in (
      select ms.id from public.menu_slots ms
      join public.menu_weeks mw on mw.id = ms.week_id
      join public.family_members fm on fm.family_id = mw.family_id
      where fm.user_id = auth.uid()
    )
  );

-- ---- comments ----
create policy "comments_select_visible" on public.comments
  for select using (
    recipe_id in (select id from public.recipes)
  );
create policy "comments_insert_own" on public.comments
  for insert with check (user_id = auth.uid());
create policy "comments_delete_own" on public.comments
  for delete using (user_id = auth.uid());

-- ---- chat_threads ----
create policy "chat_threads_select_participant" on public.chat_threads
  for select using (
    id in (select thread_id from public.chat_participants where user_id = auth.uid())
  );
create policy "chat_threads_insert_own" on public.chat_threads
  for insert with check (created_by = auth.uid());

-- ---- chat_participants ----
create policy "chat_participants_select" on public.chat_participants
  for select using (
    user_id = auth.uid()
    or thread_id in (select thread_id from public.chat_participants where user_id = auth.uid())
  );
create policy "chat_participants_insert" on public.chat_participants
  for insert with check (
    user_id = auth.uid()
    or thread_id in (select id from public.chat_threads where created_by = auth.uid())
  );

-- ---- chat_messages ----
create policy "chat_messages_select_participant" on public.chat_messages
  for select using (
    thread_id in (select thread_id from public.chat_participants where user_id = auth.uid())
  );
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and thread_id in (select thread_id from public.chat_participants where user_id = auth.uid())
  );

-- ---- events ----
create policy "events_select_visible" on public.events
  for select using (
    visibility = 'network'
    or owner_id = auth.uid()
    or id in (select event_id from public.event_participants where user_id = auth.uid())
  );
create policy "events_insert_own" on public.events
  for insert with check (owner_id = auth.uid());
create policy "events_update_own" on public.events
  for update using (owner_id = auth.uid());
create policy "events_delete_own" on public.events
  for delete using (owner_id = auth.uid());

-- ---- event_participants ----
create policy "event_participants_select" on public.event_participants
  for select using (
    user_id = auth.uid()
    or event_id in (select id from public.events where owner_id = auth.uid())
  );
create policy "event_participants_insert" on public.event_participants
  for insert with check (
    user_id = auth.uid()
    or event_id in (select id from public.events where owner_id = auth.uid())
  );

-- ---- event_dishes ----
create policy "event_dishes_select" on public.event_dishes
  for select using (
    event_id in (
      select id from public.events where owner_id = auth.uid()
      union
      select event_id from public.event_participants where user_id = auth.uid()
    )
  );
create policy "event_dishes_write" on public.event_dishes
  for all using (
    claimed_by = auth.uid()
    or event_id in (select id from public.events where owner_id = auth.uid())
  ) with check (
    claimed_by = auth.uid()
    or event_id in (select id from public.events where owner_id = auth.uid())
  );
