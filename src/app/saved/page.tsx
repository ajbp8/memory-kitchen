import { createClient } from "@/lib/supabase/server";
import RecipeCard from "@/components/RecipeCard";

// Saved tab (❤️ in the bottom nav, already wired up). Reuses RecipeCard
// exactly as Discover does — same card, same RLS-backed visibility (if a
// saved recipe's owner later flips it to private, saved_recipes still has
// the row but the join below just won't return it, same as Discover).
export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: saved } = await supabase
    .from("saved_recipes")
    .select(
      "saved_at, recipes(id, name, meal_category, cuisine_tags, save_count, owner_id, users!recipes_owner_id_fkey(name))"
    )
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  // Supabase types a nested to-one relation (saved_recipes -> recipes) as an
  // array per row regardless of the actual foreign-key cardinality, so this
  // flattens before filtering — same root cause as the users-relation casts
  // in recipes/[id]/page.tsx and discover/page.tsx.
  const recipes = (saved ?? [])
    .map((row) => row.recipes)
    .flat()
    .filter((r): r is NonNullable<typeof r> => r != null);

  return (
    <main className="min-h-screen px-5 pt-8 pb-6 bg-[var(--mk-cream)]">
      <h1 className="text-lg font-bold mb-4" style={{ color: "#1a1a1a" }}>
        Saved
      </h1>

      {recipes.length === 0 ? (
        <p className="text-xs text-neutral-500 text-center mt-10">
          Nothing saved yet — tap the heart on any recipe in Discover to keep it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
}
