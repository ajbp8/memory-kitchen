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

const CATEGORY_FILTERS = [
  {
    key: "meat", label: "Meat & Poultry", emoji: "🍗",
    keywords: ["meat & poultry","meat","beef","pork","lamb","veal","steak","bacon","ham","sausage","mince","venison","chorizo","salami","pepperoni","brisket","mutton","meatball","meatballs","poultry","chicken","turkey","duck","goose","hen","quail"],
  },
  {
    key: "seafood", label: "Fish & Seafood", emoji: "🐟",
    keywords: ["seafood","fish","salmon","tuna","cod","haddock","sardine","sardines","prawn","prawns","shrimp","crab","lobster","mussel","mussels","squid","clams","oyster","oysters","scallop","scallops","anchovy","anchovies","trout","halibut","tilapia","mackerel","herring","seabass"],
  },
  {
    key: "vegetarian", label: "Vegetarian", emoji: "🥬",
    keywords: ["vegetarian","vegan"],
  },
  {
    key: "pasta", label: "Pasta & Noodles", emoji: "🍝",
    keywords: ["pasta & noodles","pasta","spaghetti","lasagne","lasagna","fettuccine","penne","rigatoni","tagliatelle","linguine","fusilli","ravioli","tortellini","gnocchi","orzo","noodles","ramen","udon","soba","vermicelli","macaroni"],
  },
  {
    key: "rice", label: "Rice", emoji: "🍚",
    keywords: ["rice","risotto","paella","pilaf","pilau","bulgur","biryani"],
  },
  {
    key: "soup", label: "Soup", emoji: "🍲",
    keywords: ["soup","stew","broth","chowder","bisque","gazpacho","minestrone","goulash","cassoulet"],
  },
  {
    key: "salad", label: "Salad", emoji: "🥗",
    keywords: ["salad"],
  },
  {
    key: "dessert", label: "Desserts", emoji: "🍰",
    keywords: ["dessert","cake","brownie","brownies","tart","cheesecake","pudding","mousse","crepe","crepes","donut","doughnut","muffin","muffins","cupcake","sorbet","gelato","tiramisu","macaron","meringue","trifle","flapjack","truffle","fudge","cookie","cookies","biscuit","biscuits","praline","pastry","pie","pavlova"],
  },
  {
    key: "breakfast", label: "Breakfast", emoji: "🍳",
    keywords: ["breakfast","pancake","pancakes","waffle","waffles","omelette","omelet","toast","granola","porridge","oatmeal"],
  },
  {
    key: "snack", label: "Snack", emoji: "🥨",
    keywords: ["snack","nibble","dip","hummus","guacamole","bruschetta","crostini"],
  },
  {
    key: "sauce", label: "Sauce", emoji: "🫙",
    keywords: ["sauce","gravy","dressing","marinade","condiment","relish","chutney","pesto","vinaigrette"],
  },
  {
    key: "cheese", label: "Cheese", emoji: "🧀",
    keywords: ["cheese","cheddar","mozzarella","parmesan","brie","camembert","gruyere","gouda","feta","ricotta","cheesy"],
  },
  {
    key: "oven bakes", label: "Oven Bakes", emoji: "🥘",
    keywords: ["oven bakes","bake","baked","casserole","traybake","tray bake","gratin","au gratin","roast","roasted","moussaka","shepherd's pie","cottage pie","pot pie","frittata","quiche"],
  },
  {
    key: "eggs", label: "Eggs", emoji: "🍳",
    keywords: ["eggs","egg","omelette","omelet","frittata","scrambled","poached","deviled"],
  },
  {
    key: "asian", label: "Asian", emoji: "🍜",
    keywords: ["asian","chinese","japanese","thai","korean","vietnamese","sushi","ramen","dim sum","dumplings","stir fry","stir-fry","teriyaki","miso","soy","tofu","fried rice","noodles"],
  },
];

function matchesCategory(recipe: Recipe, cat: typeof CATEGORY_FILTERS[0]): boolean {
  const tags = (recipe.cuisine_tags ?? []).map(t => t.toLowerCase());
  return cat.keywords.some(kw => tags.includes(kw));
}

export default function RecipeListClient({ userId, initialRecipes }: Props) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
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
      setRecipes(initialRecipes);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchRecipes(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchRecipes, initialRecipes]);

  const activeCat = activeTag ? CATEGORY_FILTERS.find(c => c.key === activeTag) : null;

  const filteredByTag = activeCat
    ? recipes.filter(r => matchesCategory(r, activeCat))
    : recipes;

  const isSearching = query.trim().length > 0;
  const myRecipes = filteredByTag.filter(r => r.owner_id === userId);
  const sharedRecipes = filteredByTag.filter(r => r.owner_id !== userId);

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

      {/* Sticky search + tag filters */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "var(--mk-cream)", borderBottom: "1px solid var(--mk-border)" }}
      >
        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
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
              onChange={e => { setQuery(e.target.value); setActiveTag(null); }}
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

        {/* Tag filter chips */}
        <div
          className="flex gap-2 px-4 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORY_FILTERS.map(cat => {
            const active = activeTag === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { setActiveTag(active ? null : cat.key); setQuery(""); }}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={active ? {
                  background: "var(--mk-terracotta)",
                  color: "white",
                  borderColor: "var(--mk-terracotta)",
                } : {
                  background: "white",
                  color: "var(--mk-terracotta)",
                  borderColor: "var(--mk-border)",
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-5">

        <CreateRecipe />

        {loading ? (
          <div className="text-center py-8">
            <p className="text-xs animate-pulse" style={{ color: "#aaa" }}>Searching…</p>
          </div>
        ) : (isSearching || activeTag) ? (
          filteredByTag.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-6">
              No recipes found{query ? ` for "${query}"` : ""}{activeTag ? ` in ${activeCat?.label}` : ""}
            </p>
          ) : (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
                {filteredByTag.length} result{filteredByTag.length !== 1 ? "s" : ""}
                {activeCat ? ` · ${activeCat.emoji} ${activeCat.label}` : ""}
              </p>
              <div className="bg-white rounded-xl border px-3" style={{ borderColor: "var(--mk-border)" }}>
                {filteredByTag.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
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
