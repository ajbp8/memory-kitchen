"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipeCard from "@/components/RecipeCard";
import CreateRecipe from "@/components/CreateRecipe";

type Recipe = {
  id: string;
  name: string;
  cuisine_tags: string[] | null;
  save_count: number | null;
  owner_id: string;
};

interface Props {
  userId: string;
  initialRecipes: Recipe[];
}

export default function RecipeListClient({ userId, initialRecipes }: Props) {
  const [query, setQuery] = useState("");
  // Start with server-fetched data — no loading spinner on initial render
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchRecipes = useCallback(async (q: string) => {
    setLoading(true);
    const supabase = createClient();
    const term = `%${q.trim()}%`;
    const { data } = await supabase
      .from("recipes")
      .select("id, name, cuisine_tags, save_count, owner_id")
      .or(`name.ilike.${term},original_name.ilike.${term},ingredients.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(150);
    setRecipes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // No search — show initial data instantly, no network call
      setRecipes(initialRecipes);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchRecipes(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchRecipes, initialRecipes]);

  const isSearching = query.trim().length > 0;
  const myRecipes = recipes.filter(r => r.owner_id === userId);
  const sharedRecipes = recipes.filter(r => r.owner_id !== userId);

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Banner */}
      <div
        style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-4"
      >
        <h1 style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "-0.5px", color: "white" }}>
          Recipes
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in your kitchen
        </p>
      </div>

      {/* Sticky search bar */}
      <div
        className="px-4 py-3 sticky top-0 z-10"
        style={{ background: "var(--mk-cream)", borderBottom: "1px solid var(--mk-border)" }}
      >
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none"
            style={{ color: "#aaa" }}
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search recipes or ingredients…"
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--mk-border)", background: "white", color: "#1a1a1a" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "#aaa" }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-5">

        <CreateRecipe />

        {loading ? (
          <div className="text-center py-8">
            <p className="text-xs animate-pulse" style={{ color: "#aaa" }}>Searching…</p>
          </div>
        ) : isSearching ? (
          recipes.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-6">
              No recipes found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
                {recipes.length} result{recipes.length !== 1 ? "s" : ""}
              </p>
              <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
                {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
              </div>
            </section>
          )
        ) : (
          <>
            {myRecipes.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
                  My recipes ({myRecipes.length})
                </p>
                <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
                  {myRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
                </div>
              </section>
            )}
            {sharedRecipes.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
                  From the group ({sharedRecipes.length})
                </p>
                <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
                  {sharedRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
                </div>
              </section>
            )}
            {recipes.length === 0 && (
              <p className="text-xs text-neutral-400 text-center py-8">
                No recipes yet — add the first one!
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
