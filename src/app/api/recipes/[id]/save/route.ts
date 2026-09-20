import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Toggles whether the signed-in user has saved a recipe to their
// favourites. recipes.save_count is a denormalized counter so cards can
// show it without a join + count on every list - keeping it correct across
// *any* user's save/unsave (not just the recipe's owner) is handled by a
// SECURITY DEFINER trigger (migration 0002_recipe_save_counts.sql), the same
// pattern already used for family role checks, since recipes_update_own
// only lets the owner update their own recipe row.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recipeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId);

    if (error) {
      return NextResponse.json({ error: "Couldn't unsave the recipe." }, { status: 400 });
    }
    return NextResponse.json({ saved: false });
  }

  const { error } = await supabase
    .from("saved_recipes")
    .insert({ user_id: user.id, recipe_id: recipeId });

  if (error) {
    return NextResponse.json({ error: "Couldn't save the recipe." }, { status: 400 });
  }

  return NextResponse.json({ saved: true });
}
