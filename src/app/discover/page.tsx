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

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load auth once
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const loadRecipes = useCallback(async (q: string) => {
    setLoading(true);
    const supabase = createClient();

    let qb = supabase
      .from("recipes")
      .select("id, name, cuisine_tags, save_count, owner_id")
      .order("created_at", { ascending: false })
      .limit(150);

    if (q.trim()) {
      // Search across name and ingredients using case-insensitive match
      const term = `%${q.trim()}%`;
      qb = qb.or(`name.ilike.${term},ingredients.ilike.${term}`);
    }

    const { data } = await qb;
    setRecipes(data ?? []);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (userId === null) return; // wait until auth resolves
    loadRecipes("");
  }, [userId, loadRecipes]);

  // Debounced search
  useEffect(() => {
    if (userId === null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadRecipes(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, userId, loadRecipes]);

  const isSearching = query.trim().length > 0;
  const myRecipes = recipes.filter(r => r.owner_id === userId);
  const sharedRecipes = recipes.filter(r => r.owner_id !== userId);

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Banner */}
      <div
        style={{ background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)" }}
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

        {/* Add a recipe */}
        <CreateRecipe />

        {loading ? (
          <div className="text-center py-8">
            <p className="text-xs animate-pulse" style={{ color: "#aaa" }}>
              {isSearching ? "Searching…" : "Loading recipes…"}
            </p>
          </div>
        ) : isSearching ? (
          /* ── Search results ── */
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
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </section>
          )
        ) : (
          /* ── Default two-section view ── */
          <>
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
