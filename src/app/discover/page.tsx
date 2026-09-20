import { createClient } from "@/lib/supabase/server";
import RecipeCard from "@/components/RecipeCard";
import CreateRecipe from "@/components/CreateRecipe";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch ALL recipes from the shared pool (own + everyone's)
  const { data: allRecipes } = await supabase
    .from("recipes")
    .select("id, name, meal_category, cuisine_tags, save_count, owner_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const myRecipes = (allRecipes ?? []).filter(r => r.owner_id === user.id);
  const sharedRecipes = (allRecipes ?? []).filter(r => r.owner_id !== user.id);

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Banner */}
      <div style={{ background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)" }}
        className="px-5 pt-10 pb-5">
        <h1 style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "-0.5px", color: "white" }}>
          Recipes
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
          {(allRecipes?.length ?? 0)} recipes in your kitchen
        </p>
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* Add a recipe */}
        <CreateRecipe />

        {/* My recipes */}
        {myRecipes.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
              My recipes ({myRecipes.length})
            </p>
            <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
              {myRecipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}

        {/* Shared pool */}
        {sharedRecipes.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
              From the group ({sharedRecipes.length})
            </p>
            <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
              {sharedRecipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}

        {(allRecipes?.length ?? 0) === 0 && (
          <p className="text-xs text-neutral-400 text-center py-8">
            No recipes yet — add the first one!
          </p>
        )}
      </div>
    </main>
  );
}
