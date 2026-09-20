"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const MEAL_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];

export default function CreateRecipe() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mealCategory, setMealCategory] = useState("Dinner");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setName(""); setStory(""); setIngredients(""); setSourceUrl(""); setMealCategory("Dinner");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, story, ingredients,
        source_url: sourceUrl,
        meal_category: mealCategory,
        visibility: "public",
      }),
    });
    if (res.ok) {
      reset(); setOpen(false); setStatus("idle"); router.refresh(); return;
    }
    let message = "Something went wrong.";
    try { const d = await res.json(); if (d?.error) message = d.error; } catch {}
    setErrorMsg(message);
    setStatus("error");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl py-3 text-sm font-bold"
        style={{ background: "#1B5E2E", color: "white" }}
      >
        + Add a recipe
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4"
      style={{ borderColor: "var(--mk-border)", background: "white" }}>
      <p className="text-sm font-bold mb-3" style={{ color: "#1a1a1a" }}>Add a recipe</p>

      <input type="text" required placeholder="Recipe name *" value={name}
        onChange={e => setName(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }} />

      <input type="url" placeholder="Link (IG, YouTube, website…)" value={sourceUrl}
        onChange={e => setSourceUrl(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }} />

      <textarea placeholder="Ingredients (optional)" value={ingredients}
        onChange={e => setIngredients(e.target.value)} rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }} />

      <textarea placeholder="Notes or story (optional)" value={story}
        onChange={e => setStory(e.target.value)} rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-3"
        style={{ borderColor: "var(--mk-border)" }} />

      <select value={mealCategory} onChange={e => setMealCategory(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-3"
        style={{ borderColor: "var(--mk-border)" }}>
        {MEAL_CATEGORIES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setOpen(false); setErrorMsg(""); setStatus("idle"); }}
          className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--mk-border)", color: "#888" }}>
          Cancel
        </button>
        <button type="submit" disabled={status === "working"}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#D4A017" }}>
          {status === "working" ? "Saving…" : "Save recipe"}
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-500 mt-2 text-center">{errorMsg}</p>}
    </form>
  );
}
