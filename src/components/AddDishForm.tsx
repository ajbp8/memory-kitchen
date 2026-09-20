"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RecipeOption = { id: string; name: string };

// Lives at the bottom of each meal-type card on the home page. Defaults to
// a collapsed "+ Add a dish" link (mockup screens stay uncluttered) and
// expands into a small form on click. Mirrors CreateHousehold's fetch +
// router.refresh() pattern rather than a raw <form action> POST, so the
// page updates in place without a full navigation.
export default function AddDishForm({
  dayDate,
  mealType,
  recipes,
}: {
  dayDate: string;
  mealType: string;
  recipes: RecipeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeId && !freeText.trim()) return;
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/menu/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_date: dayDate,
        meal_type: mealType,
        recipe_id: recipeId || null,
        free_text: recipeId ? "" : freeText.trim(),
      }),
    });

    if (res.ok) {
      setRecipeId("");
      setFreeText("");
      setOpen(false);
      setStatus("idle");
      router.refresh();
      return;
    }

    let message = "Couldn't add that dish.";
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold mt-1"
        style={{ color: "var(--mk-terracotta)" }}
      >
        + Add a dish
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
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
        placeholder="Or describe a dish (e.g. Green salad)"
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
          {status === "working" ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setErrorMsg("");
            setStatus("idle");
          }}
          className="px-3 rounded-lg py-1.5 text-xs font-semibold"
          style={{ background: "#f7f4ef", color: "#888" }}
        >
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
    </form>
  );
}
