-- Fix infinite recursion (42P17) in events / event_participants / event_dishes RLS policies.
-- events_select_visible queried event_participants, while event_participants_select and
-- event_participants_insert queried events back - a circular A -> B -> A reference.
-- event_dishes_select/write had the same cross-table pattern.
--
-- Fix: SECURITY DEFINER helper functions run as the function owner (bypassing RLS
-- internally), so policies can call them instead of inlining a cross-table subquery,
-- breaking the cycle.

create or replace function public.is_event_owner(p_event_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from events where id = p_event_id and owner_id = auth.uid()
  );
$function$;

create or replace function public.is_event_participant(p_event_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from event_participants where event_id = p_event_id and user_id = auth.uid()
  );
$function$;

grant execute on function public.is_event_owner(uuid) to authenticated;
grant execute on function public.is_event_participant(uuid) to authenticated;

drop policy if exists events_select_visible on events;
create policy events_select_visible on events for select
  using (
    visibility = 'network'
    or owner_id = auth.uid()
    or is_event_participant(id)
  );

drop policy if exists event_participants_select on event_participants;
create policy event_participants_select on event_participants for select
  using (
    user_id = auth.uid()
    or is_event_owner(event_id)
  );

drop policy if exists event_participants_insert on event_participants;
create policy event_participants_insert on event_participants for insert
  with check (
    user_id = auth.uid()
    or is_event_owner(event_id)
  );

drop policy if exists event_dishes_select on event_dishes;
create policy event_dishes_select on event_dishes for select
  using (
    is_event_owner(event_id)
    or is_event_participant(event_id)
  );

drop policy if exists event_dishes_write on event_dishes;
create policy event_dishes_write on event_dishes for all
  using (
    claimed_by = auth.uid()
    or is_event_owner(event_id)
  )
  with check (
    claimed_by = auth.uid()
    or is_event_owner(event_id)
  );
