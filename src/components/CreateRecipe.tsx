"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Common words to strip when auto-extracting tags
const STOPWORDS = new Set([
  "a","an","the","and","or","with","of","in","to","for","on","at","by",
  "from","up","about","into","is","are","was","were","be","been","have",
  "has","had","do","does","did","will","would","could","should","may",
  "cup","cups","tbsp","tsp","tablespoon","teaspoon","oz","lb","kg","ml","g",
  "large","small","medium","fresh","dried","ground","chopped","diced",
  "minced","sliced","grated","whole","optional","some","few","one","two",
  "three","four","half","piece","pieces","pinch","dash","handful","slice",
]);

function extractTags(name: string, ingredients: string): string[] {
  const text = `${name} ${ingredients}`.toLowerCase();
  const words = text
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 10);
}

export default function CreateRecipe() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-extract tags whenever name or ingredients change
  useEffect(() => {
    if (name || ingredients) {
      setTags(extractTags(name, ingredients));
    } else {
      setTags([]);
    }
  }, [name, ingredients]);

  function reset() {
    setName(""); setStory(""); setIngredients(""); setSourceUrl(""); setTags([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        story,
        ingredients,
        source_url: sourceUrl,
        cuisine_tags: tags,
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

      <input
        type="text"
        required
        placeholder="Recipe name *"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }}
      />

      <input
        type="url"
        placeholder="Link (IG, YouTube, website…)"
        value={sourceUrl}
        onChange={e => setSourceUrl(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }}
      />

      <textarea
        placeholder="Ingredients (optional)"
        value={ingredients}
        onChange={e => setIngredients(e.target.value)}
        rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }}
      />

      <textarea
        placeholder="Notes or story (optional)"
        value={story}
        onChange={e => setStory(e.target.value)}
        rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-3"
        style={{ borderColor: "var(--mk-border)" }}
      />

      {/* Auto-tags preview */}
      {tags.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#aaa" }}>
            Auto-tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(27,94,46,0.1)", color: "#1B5E2E" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setErrorMsg(""); setStatus("idle"); reset(); }}
          className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--mk-border)", color: "#888" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "working"}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#D4A017" }}
        >
          {status === "working" ? "Saving…" : "Save recipe"}
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-500 mt-2 text-center">{errorMsg}</p>}
    </form>
  );
}
