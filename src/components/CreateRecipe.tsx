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
const VEGETARIAN_KW = new Set(["vegetarian","vegan","tofu","tempeh","lentil","lentils","chickpea","chickpeas","bean","beans","veggie","vegetable","vegetables"]);
const ASIAN_KW   = new Set(["asian","chinese","japanese","thai","vietnamese","korean","sushi","dim sum","stir fry","wok","miso","teriyaki","soy","ramen","udon","soba","dumplings","kimchi","pho","banh mi","bulgogi","bibimbap"]);
const CHEESE_KW  = new Set(["cheese","cheddar","mozzarella","parmesan","brie","camembert","gruyere","gouda","feta","ricotta","cheesy","halloumi"]);
const OVEN_KW    = new Set(["bake","baked","casserole","traybake","gratin","au gratin","roast","roasted","moussaka","frittata","quiche"]);
// ─────────────────────────────────────────────────────────────────────────────

const ALL_TAGS = ["meat & poultry","seafood","vegetarian","pasta & noodles","rice","soup","salad","dessert","breakfast","snack","sauce","asian","cheese","oven bakes"];
const TAG_EMOJI: Record<string, string> = {
  "meat & poultry": "🍗", seafood: "🐟", vegetarian: "🥦",
  "pasta & noodles": "🍝", rice: "🍚", soup: "🍲", salad: "🥗",
  dessert: "🍰", breakfast: "🍳", snack: "🥨", sauce: "🫙", asian: "🍜",
  cheese: "🧀", "oven bakes": "🥘",
};

function classifyRecipe(name: string, ingredients: string): string[] {
  const nameText = name.toLowerCase();
  const fullText = `${name} ${ingredients}`.toLowerCase();
  const words    = new Set(fullText.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 1));

  const nameHas = (kwSet: Set<string>) => [...kwSet].some(kw => nameText.includes(kw));
  const anyHas  = (kwSet: Set<string>) => [...kwSet].some(kw => words.has(kw));

  const tags: string[] = [];

  // Primary — only tag if there's an actual match; no default fallback
  if      (anyHas(MEAT_KW) || anyHas(POULTRY_KW))            tags.push("meat & poultry");
  else if (anyHas(SEAFOOD_KW))                                tags.push("seafood");
  else if (nameHas(DESSERT_NAME_KW) || anyHas(DESSERT_ING_KW)) tags.push("dessert");
  else if (anyHas(VEGETARIAN_KW))                             tags.push("vegetarian");
  // If nothing matched, leave primary empty — user can add manually

  if (anyHas(PASTA_KW))  tags.push("pasta & noodles");
  if (anyHas(RICE_KW))   tags.push("rice");
  if (anyHas(SOUP_KW))   tags.push("soup");
  if (anyHas(SALAD_KW))  tags.push("salad");
  if (anyHas(ASIAN_KW))  tags.push("asian");
  if (anyHas(CHEESE_KW)) tags.push("cheese");
  if (anyHas(OVEN_KW))  tags.push("oven bakes");

  return tags;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+on Instagram:.*$/i, "")
    .replace(/\s+on TikTok:.*$/i, "")
    .replace(/\s*[\|–\-•]\s*.{1,40}$/, "")
    .replace(/\s*-\s*YouTube$/i, "")
    .trim();
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
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [originalName, setOriginalName] = useState("");

  useEffect(() => {
    if (name || ingredients) {
      setTags(classifyRecipe(name, ingredients));
    } else {
      setTags([]);
    }
  }, [name, ingredients]);

  async function fetchMetaFromUrl(url: string) {
    if (!url || !url.startsWith("http")) return;
    setFetchingMeta(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          const cleaned = cleanTitle(data.title);
          if (cleaned && cleaned.length > 1) {
            setName(prev => {
              if (!prev) {
                setAutoFilled(true);
                setTranslated(false);
                setOriginalName("");
                return cleaned;
              }
              return prev;
            });
          }
        }
      }
    } catch {}
    setFetchingMeta(false);
  }

  async function handleTranslate() {
    if (!name || translating) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated) {
          setOriginalName(name);
          setName(data.translated);
          setTranslated(true);
          setAutoFilled(false);
        }
      }
    } catch {}
    setTranslating(false);
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  function addTag(tag: string) {
    if (!tags.includes(tag)) setTags(prev => [...prev, tag]);
  }

  function reset() {
    setName(""); setStory(""); setIngredients(""); setSourceUrl("");
    setTags([]); setAutoFilled(false); setTranslated(false); setOriginalName("");
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
        original_name: originalName || null,
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
        style={{ background: "#065130", color: "white" }}
      >
        + Add a recipe
      </button>
    );
  }


  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4"
      style={{ borderColor: "var(--mk-border)", background: "white" }}>
      <p className="text-sm font-bold mb-3" style={{ color: "#1a1a1a" }}>Add a recipe</p>

      {/* URL field */}
      <div className="relative mb-2">
        <input
          type="url"
          placeholder="Paste a link (IG, YouTube, website…)"
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          onPaste={e => {
            const pasted = e.clipboardData.getData("text");
            if (pasted.startsWith("http")) setTimeout(() => fetchMetaFromUrl(pasted), 80);
          }}
          onBlur={e => {
            if (e.target.value.startsWith("http") && !name) fetchMetaFromUrl(e.target.value);
          }}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--mk-border)" }}
        />
        {fetchingMeta && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "#aaa" }}>
            Fetching…
          </span>
        )}
      </div>

      {/* Name field */}
      <div className="relative mb-1">
        <input
          type="text"
          required
          placeholder="Recipe name *"
          value={name}
          onChange={e => { setName(e.target.value); setAutoFilled(false); setTranslated(false); setOriginalName(""); }}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none pr-24"
          style={{ borderColor: translated ? "#D4A017" : autoFilled ? "#065130" : "var(--mk-border)" }}
        />
        {translated ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold" style={{ color: "#D4A017" }}>✓ translated</span>
        ) : autoFilled ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold" style={{ color: "#065130" }}>✓ auto-filled</span>
        ) : null}
      </div>

      {/* Translate button */}
      {name && !translated && (
        <div className="mb-2">
          <button type="button" onClick={handleTranslate} disabled={translating}
            className="text-[11px] font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(212,160,23,0.12)", color: "#D4A017", border: "1px solid rgba(212,160,23,0.3)" }}>
            {translating ? "Translating…" : "🌐 Translate to English"}
          </button>
        </div>
      )}

      <textarea placeholder="Ingredients (optional)" value={ingredients}
        onChange={e => setIngredients(e.target.value)} rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }} />

      <textarea placeholder="Notes or story (optional)" value={story}
        onChange={e => setStory(e.target.value)} rows={2}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-3"
        style={{ borderColor: "var(--mk-border)" }} />

      {/* Tags — emoji pill chips matching EditRecipeForm */}
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mk-terracotta)" }}>Tags</p>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map(tag => {
            const active = tags.includes(tag);
            return (
              <button key={tag} type="button"
                onClick={() => active ? removeTag(tag) : addTag(tag)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-all"
                style={active ? {
                  background: "var(--mk-terracotta)", color: "white", borderColor: "var(--mk-terracotta)",
                } : {
                  background: "white", color: "var(--mk-terracotta)", borderColor: "var(--mk-border)",
                }}>
                <span>{TAG_EMOJI[tag] ?? "🏷️"}</span>
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button"
          onClick={() => { setOpen(false); setErrorMsg(""); setStatus("idle"); reset(); }}
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
