"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MEAL_CATEGORIES = ["breakfast", "lunch", "dinner", "snack", "dessert", "other"];

type Recipe = {
  id: string;
  name: string;
  story: string | null;
  source_url: string | null;
  ingredients: string[] | string | null;
  meal_category: string | null;
};

function ingredientsToText(ingredients: string[] | string | null): string {
  if (!ingredients) return "";
  if (Array.isArray(ingredients)) return ingredients.join("\n");
  return String(ingredients);
}

export default function EditRecipeForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();

  const [name, setName] = useState(recipe.name);
  const [story, setStory] = useState(recipe.story ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe.source_url ?? "");
  const [ingredients, setIngredients] = useState(ingredientsToText(recipe.ingredients));
  const [mealCategory, setMealCategory] = useState(recipe.meal_category ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    // Convert ingredients textarea → string array (split by line, trim, drop empty)
    const ingredientsArray = ingredients
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        story: story.trim() || null,
        source_url: sourceUrl.trim() || null,
        ingredients: ingredientsArray.length > 0 ? ingredientsArray : null,
        meal_category: mealCategory || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    // Back to the recipe detail page
    router.push(`/recipes/${recipe.id}`);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)] bg-white";
  const borderStyle = { borderColor: "var(--mk-border)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Name */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#D4A017" }}>
          Recipe name *
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder="e.g. Chicken & Zucchini Fritters"
        />
      </div>

      {/* Meal category */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#D4A017" }}>
          Meal type
        </label>
        <select
          value={mealCategory}
          onChange={(e) => setMealCategory(e.target.value)}
          className={inputClass}
          style={borderStyle}
        >
          <option value="">— choose one —</option>
          {MEAL_CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Story / note */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#D4A017" }}>
          Story / note
        </label>
        <textarea
          rows={3}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder="Where did you find this? What makes it special?"
        />
      </div>

      {/* Ingredients */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#D4A017" }}>
          Ingredients <span className="normal-case font-normal opacity-60">(one per line)</span>
        </label>
        <textarea
          rows={5}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder={"2 chicken breasts\n1 zucchini\n1 egg\n…"}
        />
      </div>

      {/* Source URL */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#D4A017" }}>
          Source URL
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder="https://www.instagram.com/reel/…"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 mt-2"
        style={{ background: "#D4A017" }}
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
