import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import SaveButton from "@/components/SaveButton";

const CUISINE_EMOJI: Record<string, string> = {
  "meat & poultry": "🍗", meat: "🍗", poultry: "🍗", seafood: "🐟",
  vegetarian: "🥦", sides: "🥬", vegan: "🌱", dessert: "🍰",
  baking: "🍞", breakfast: "🍳", snack: "🥨", sauce: "🫙",
  "pasta & noodles": "🍝", pasta: "🍝", italian: "🍝",
  rice: "🍚", soup: "🍲", salad: "🥗", curry: "🍛",
  asian: "🍜", cheese: "🧀", "oven bakes": "🥘", eggs: "🥚", thai: "🍜", chinese: "🥡", japanese: "🍣",
  mexican: "🌮", indian: "🍛", french: "🥐",
  mediterranean: "🥙", american: "🍔", "middle-eastern": "🫙",
  beef: "🥩", pork: "🥩", chicken: "🍗", turkey: "🍗",
  fish: "🐟", salmon: "🐟", egg: "🍳", eggs: "🍳",
};
function getEmoji(tags: string[] | null) {
  if (!tags) return "🍽️";
  for (const t of tags) {
    const emoji = CUISINE_EMOJI[t.toLowerCase()];
    if (emoji) return emoji;
  }
  return "🍽️";
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Only select columns that actually exist in the schema
  const [recipeResult, savedResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, story, ingredients, source_url, cuisine_tags, save_count, owner_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("recipe_id", id)
      .maybeSingle(),
  ]);

  const recipe = recipeResult.data;
  if (!recipe) notFound();

  // savedResult may error due to RLS — default to false rather than crashing
  const isSaved = !savedResult.error && !!savedResult.data;
  const emoji = getEmoji(recipe.cuisine_tags);
  const ingredients = recipe.ingredients as string[] | string | null;

  return (
    <div className="min-h-screen" style={{ background: "var(--mk-cream)" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-6">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm font-medium mb-4"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          ← Back to recipes
        </Link>
        <div className="flex items-start gap-3">
          <span className="text-4xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{recipe.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(recipe.owner_id === user.id || user.id === "c3342872-a9e3-4097-a75d-b67aefa8dead") && (
              <Link
                href={`/recipes/${recipe.id}/edit`}
                aria-label="Edit recipe"
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)" }}
              >
                {/* Pencil icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Link>
            )}
            <SaveButton recipeId={recipe.id} initiallySaved={isSaved} />
          </div>
        </div>
        {recipe.save_count != null && recipe.save_count > 0 && (
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            ♥ Saved by {recipe.save_count} {recipe.save_count === 1 ? "person" : "people"}
          </p>
        )}
      </div>

      <div className="px-5 pt-4 pb-24 space-y-3">

        {/* Cuisine tags */}
        {Array.isArray(recipe.cuisine_tags) && recipe.cuisine_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(recipe.cuisine_tags as string[]).map((tag: string) => (
              <span key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize"
                style={{ background: "white", color: "var(--mk-terracotta)", borderColor: "var(--mk-border)" }}>
                <span>{CUISINE_EMOJI[tag.toLowerCase()] ?? "🏷️"}</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Story */}
        {recipe.story && (
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--mk-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#D4A017" }}>Story</p>
            <p className="text-sm text-neutral-600 leading-relaxed italic">{recipe.story}</p>
          </div>
        )}

        {/* Ingredients */}
        {ingredients && (
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--mk-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#D4A017" }}>Ingredients</p>
            {Array.isArray(ingredients) ? (
              <ul className="space-y-1.5">
                {ingredients.map((ing: string, idx: number) => (
                  <li key={idx} className="text-sm text-neutral-700 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#D4A017", opacity: 0.7 }} />
                    {ing}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-600 whitespace-pre-line">{String(ingredients)}</p>
            )}
          </div>
        )}

        {/* Source link */}
        {recipe.source_url && (
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "var(--mk-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#D4A017" }}>Source</p>
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
              className="text-sm underline break-all" style={{ color: "#065130" }}>
              {recipe.source_url}
            </a>
          </div>
        )}

        {/* Empty state */}
        {!recipe.story && !ingredients && !recipe.source_url && (
          <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: "var(--mk-border)" }}>
            <p className="text-sm text-neutral-400">No details added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
