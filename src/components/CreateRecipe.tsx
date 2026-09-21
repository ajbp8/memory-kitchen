"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Recipe classifier ────────────────────────────────────────────────────────
const MEAT_KW    = new Set(["beef","pork","lamb","veal","steak","bacon","ham","sausage","mince","venison","chorizo","salami","pepperoni","brisket","mutton","meatball","meatballs"]);
const POULTRY_KW = new Set(["chicken","turkey","duck","goose","hen","quail"]);
const SEAFOOD_KW = new Set(["fish","salmon","tuna","cod","haddock","sardine","sardines","prawn","prawns","shrimp","crab","lobster","mussel","mussels","squid","clams","oyster","oysters","scallop","scallops","anchovy","anchovies","trout","halibut","tilapia","mackerel","herring","seabass","seafood"]);
const DESSERT_NAME_KW = new Set(["cake","brownie","brownies","tart","cheesecake","pudding","mousse","crepe","crepes","donut","doughnut","muffin","muffins","cupcake","sorbet","gelato","tiramisu","macaron","meringue","trifle","flapjack","truffle","fudge","cookie","cookies","biscuit","biscuits","praline","parfait","pavlova","cannoli","eclair","profiterole","dessert"]);
const DESSERT_ING_KW  = new Set(["icing","frosting","ganache","fondant","caramel","custard"]);
const PASTA_KW   = new Set(["pasta","spaghetti","lasagne","lasagna","fettuccine","penne","rigatoni","tagliatelle","linguine","fusilli","ravioli","tortellini","gnocchi","orzo","noodles","ramen","udon","soba","vermicelli","macaroni"]);
const RICE_KW    = new Set(["rice","risotto","paella","pilaf","pilau","bulgur","biryani"]);
const SOUP_KW    = new Set(["soup","stew","broth","chowder","bisque","gazpacho","minestrone","goulash","cassoulet"]);
const CURRY_KW   = new Set(["curry","dhal","dal","tikka","masala","korma","tagine"]);
const SALAD_KW   = new Set(["salad"]);
// ─────────────────────────────────────────────────────────────────────────────

function classifyRecipe(name: string, ingredients: string): string[] {
  const nameText = name.toLowerCase();
  const fullText = `${name} ${ingredients}`.toLowerCase();
  const words    = new Set(fullText.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 1));

  const nameHas = (kwSet: Set<string>) => [...kwSet].some(kw => nameText.includes(kw));
  const anyHas  = (kwSet: Set<string>) => [...kwSet].some(kw => words.has(kw));

  // Primary category — priority: meat > poultry > seafood > dessert > vegetarian
  let primary: string;
  if      (anyHas(MEAT_KW))                             primary = "meat";
  else if (anyHas(POULTRY_KW))                          primary = "poultry";
  else if (anyHas(SEAFOOD_KW))                          primary = "seafood";
  else if (nameHas(DESSERT_NAME_KW) || anyHas(DESSERT_ING_KW)) primary = "dessert";
  else                                                  primary = "vegetarian";

  // Descriptive tags
  const tags: string[] = [primary];
  if (anyHas(PASTA_KW))  tags.push("pasta");
  if (anyHas(RICE_KW))   tags.push("rice");
  if (anyHas(SOUP_KW))   tags.push("soup");
  if (anyHas(CURRY_KW))  tags.push("curry");
  if (anyHas(SALAD_KW))  tags.push("salad");

  return tags;
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

  // Auto-classify whenever name or ingredients change
  useEffect(() => {
    if (name || ingredients) {
      setTags(classifyRecipe(name, ingredients));
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

      {/* Category preview */}
      {tags.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#aaa" }}>
            Category
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: i === 0 ? "rgba(27,94,46,0.15)" : "rgba(27,94,46,0.07)",
                  color: "#1B5E2E",
                  fontWeight: i === 0 ? 700 : 500,
                }}
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
