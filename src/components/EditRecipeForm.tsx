"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ALL_TAGS = [
  "meat & poultry","seafood","vegetarian",
  "pasta & noodles","rice","soup","salad",
  "dessert","breakfast","snack","sauce","asian",
];

const TAG_EMOJI: Record<string, string> = {
  "meat & poultry": "🍗", seafood: "🐟", vegetarian: "🥦",
  "pasta & noodles": "🍝", rice: "🍚", soup: "🍲", salad: "🥗",
  dessert: "🍰", breakfast: "🍳", snack: "🥨", sauce: "🫙", asian: "🍜",
};

type Recipe = {
  id: string;
  name: string;
  story: string | null;
  source_url: string | null;
  ingredients: string[] | string | null;
  cuisine_tags: string[] | null;
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
  const [tags, setTags] = useState<string[]>(recipe.cuisine_tags ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [deleting, setDeleting] = useState<"idle" | "confirm" | "working">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        story: story.trim() || null,
        source_url: sourceUrl.trim() || null,
        ingredients: ingredients.trim() || null,
        cuisine_tags: tags,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

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
        <label
          className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color: "#D4A017" }}
        >
          Recipe name *
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder="e.g. Chicken & Zucchini Fritters"
        />
      </div>

      {/* Tags */}
      <div>
        <label
          className="text-[10px] font-bold uppercase tracking-wider block mb-2"
          style={{ color: "#D4A017" }}
        >
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map(tag => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{
                  background: active ? "var(--mk-terracotta)" : "white",
                  color: active ? "white" : "var(--mk-terracotta)",
                  borderColor: active ? "var(--mk-terracotta)" : "var(--mk-border)",
                }}
              >
                <span>{TAG_EMOJI[tag]}</span>
                <span className="capitalize">{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story / note */}
      <div>
        <label
          className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color: "#D4A017" }}
        >
          Story / note
        </label>
        <textarea
          rows={3}
          value={story}
          onChange={e => setStory(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder="Where did you find this? What makes it special?"
        />
      </div>

      {/* Ingredients */}
      <div>
        <label
          className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color: "#D4A017" }}
        >
          Ingredients{" "}
          <span className="normal-case font-normal opacity-60">(one per line)</span>
        </label>
        <textarea
          rows={5}
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          className={inputClass}
          style={borderStyle}
          placeholder={"2 chicken breasts\n1 zucchini\n1 egg\n…"}
        />
      </div>

      {/* Source URL */}
      <div>
        <label
          className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color: "#D4A017" }}
        >
          Source URL
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
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

      {/* Delete recipe */}
      <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--mk-border)" }}>
        {deleting === "idle" && (
          <button
            type="button"
            onClick={() => setDeleting("confirm")}
            className="w-full text-sm font-bold text-red-400 py-2 hover:text-red-600 transition-colors"
          >
            Delete this recipe
          </button>
        )}
        {deleting === "confirm" && (
          <div className="text-center">
            <p className="text-xs text-neutral-500 mb-2">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting("idle")}
                className="flex-1 rounded-xl border py-2 text-xs font-semibold"
                style={{ borderColor: "var(--mk-border)", color: "#888" }}>
                Cancel
              </button>
              <button type="button"
                onClick={async () => {
                  setDeleting("working");
                  await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
                  router.push("/recipes");
                  router.refresh();
                }}
                className="flex-1 rounded-xl py-2 text-xs font-bold text-white"
                style={{ background: "#dc2626" }}>
                Yes, delete
              </button>
            </div>
          </div>
        )}
        {deleting === "working" && (
          <p className="text-xs text-center text-neutral-400">Deleting…</p>
        )}
      </div>
    </form>
  );
}
