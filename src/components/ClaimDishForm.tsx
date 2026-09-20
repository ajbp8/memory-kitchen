"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RecipeOption = { id: string; name: string };

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "starter", label: "Starter" },
  { value: "main", label: "Main" },
  { value: "dessert", label: "Dessert" },
  { value: "drinks", label: "Drinks" },
  { value: "other", label: "Other" },
];

// Same shape as AddDishForm (collapsed link -> form -> POST -> refresh), but
// posts to /api/events/[id]/dishes and includes a category select, since
// event_dishes (unlike menu_dishes) groups by starter/main/dessert/drinks/
// other rather than by meal type.
export default function ClaimDishForm({
  eventId,
  recipes,
}: {
  eventId: string;
  recipes: RecipeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [category, setCategory] = useState("other");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeId && !freeText.trim()) return;
    setStatus("working");
    setErrorMsg("");

    const res = await fetch(`/api/events/${eventId}/dishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe_id: recipeId || null,
        free_text: recipeId ? "" : freeText.trim(),
        category,
      }),
    });

    if (res.ok) {
      setRecipeId("");
      setFreeText("");
      setCategory("other");
      setOpen(false);
      setStatus("idle");
      router.refresh();
      return;
    }

    let message = "Couldn't claim that dish.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error response - fall back to generic message.
    }
    setErrorMsg(message);
    setStatus("error");
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer"
        style={{ background: "#f7f4ef" }}
      >
        <span className="text-xs">🍽️</span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--mk-terracotta)" }}>
          + Claim a dish
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-2 rounded-md" style={{ background: "#f7f4ef" }}>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 text-xs"
        style={{ borderColor: "var(--mk-border)" }}
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {recipes.length > 0 && (
        <select
          value={recipeId}
          onChange={(e) => {
            setRecipeId(e.target.value);
            if (e.target.value) setFreeText("");
          }}
          className="w-full rounded-lg border px-2 py-1.5 text-xs"
          style={{ borderColor: "var(--mk-border)" }}
        >
          <option value="">Pick one of your recipes...</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        placeholder="Or describe a dish (e.g. Chicken wings)"
        value={freeText}
        disabled={Boolean(recipeId)}
        onChange={(e) => setFreeText(e.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
        style={{ borderColor: "var(--mk-border)" }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "working"}
          className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(to right, #c8602a, #e8854a)" }}
        >
          {status === "working" ? "Claiming..." : "Claim"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setErrorMsg("");
            setStatus("idle");
          }}
          className="px-3 rounded-lg py-1.5 text-xs font-semibold"
          style={{ background: "white", color: "#888" }}
        >
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
    </form>
  );
}
