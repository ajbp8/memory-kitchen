-- Mutual-friends count helper, for the badge on Discover cards and
-- the recipe-detail owner row (mockup screens 2 and 3).
--
-- Per-card mutual-friend lookups would mean one query per card if done
-- naively. Instead this takes an array of owner ids (collected once from
-- a page's recipe results) and returns counts for all of them in a single
-- round trip.
--
-- SECURITY DEFINER is required here, not just convenient: computing is X
-- friends with Y for an X that isn't the caller requires reading
-- friendship rows that don't mention auth.uid() at all, which
-- friendships_select_own correctly blocks under normal RLS. The function
-- runs as its owner (bypassing RLS internally) but only ever returns an
-- aggregate count, never raw rows, so it doesn't leak who a stranger's
-- friends are, just how many of them overlap with the caller's own list.

create or replace function public.mutual_friend_counts(p_user_ids uuid[])
returns table(other_id uuid, mutual_count bigint)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with my_friends as (
      select friend_id as uid from friendships where status = 'accepted' and user_id = auth.uid()
      union
      select user_id as uid from friendships where status = 'accepted' and friend_id = auth.uid()
    ),
  their_pairs as (
      select user_id as owner_id, friend_id as friend_uid from friendships
      where status = 'accepted' and user_id = any(p_user_ids)
      union
      select friend_id as owner_id, user_id as friend_uid from friendships
      where status = 'accepted' and friend_id = any(p_user_ids)
    )
  select tp.owner_id as other_id, count(*) as mutual_count
  from their_pairs tp
  join my_friends mf on mf.uid = tp.friend_uid
  where tp.owner_id != auth.uid()
  group by tp.owner_id;
$function$;

grant execute on function public.mutual_friend_counts(uuid[]) to authenticated;
