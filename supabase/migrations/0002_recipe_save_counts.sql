-- Memory Kitchen - Session 3: keep recipes.save_count in sync
--
-- saving a recipe is an action performed by a different user than the
-- recipe's owner, but recipes_update_own only lets owner_id = auth.uid()
-- update a recipe row directly. So a plain client-side
-- increment save_count update would be blocked by RLS for everyone except
-- the owner saving their own recipe.
--
-- Fix: same SECURITY DEFINER pattern already used for is_family_member and
-- is_family_admin. A SECURITY DEFINER trigger function runs with the
-- function owner's privileges, so it can update recipes.save_count
-- regardless of who triggered the insert/delete on saved_recipes.

create or replace function public.adjust_recipe_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.recipes
      set save_count = save_count + 1
      where id = new.recipe_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.recipes
      set save_count = greatest(save_count - 1, 0)
      where id = old.recipe_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists saved_recipes_after_insert on public.saved_recipes;
create trigger saved_recipes_after_insert
  after insert on public.saved_recipes
  for each row execute function public.adjust_recipe_save_count();

drop trigger if exists saved_recipes_after_delete on public.saved_recipes;
create trigger saved_recipes_after_delete
  after delete on public.saved_recipes
  for each row execute function public.adjust_recipe_save_count();
