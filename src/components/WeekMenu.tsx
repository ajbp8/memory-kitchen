"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

type Recipe = { id: string; name: string; cuisine_tags: string[] | null };
type Dish = { id: string; recipe_id: string | null; free_text: string | null; recipes?: { name: string; cuisine_tags: string[] | null } | null };
type Slot = { id: string; day_date: string; meal_type: string; dishes: Dish[] };
type WeekData = { week_id: string | null; slots: Slot[] };
type NestorSuggestion = { name: string; description: string; cookTime?: string };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CUISINE_EMOJI: Record<string, string> = {
  // Primary categories
  meat: "🥩", poultry: "🍗", seafood: "🐟", vegetarian: "🥬", dessert: "🍰",
  // Descriptive tags
  pasta: "🍝", rice: "🍚", soup: "🍲", curry: "🍛", salad: "🥗",
  // Legacy cuisine names (recipes added before redesign)
  italian: "🍝", mexican: "🌮", indian: "🍛", chinese: "🥡", japanese: "🍣",
  thai: "🍜", french: "🥐", mediterranean: "🥙", american: "🍔",
  "middle-eastern": "🫙", baking: "🍞",
};
const MEAL_TABS = [
  { key: "dinner",    label: "Dinner",    icon: "🍽️" },
  { key: "sides",     label: "Sides",     icon: "🥗" },
  { key: "lunch",     label: "Lunch",     icon: "☀️" },
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
];

// ─── Fixed primary category filter chips ─────────────────────────────────────
const CATEGORY_FILTERS = [
  {
    key: "meat", label: "Meat", emoji: "🥩",
    keywords: ["meat","beef","pork","lamb","veal","steak","bacon","ham","sausage","mince","venison","chorizo","salami","pepperoni","brisket","mutton","meatball","meatballs"],
  },
  {
    key: "poultry", label: "Poultry", emoji: "🍗",
    keywords: ["poultry","chicken","turkey","duck","goose","hen","quail"],
  },
  {
    key: "seafood", label: "Fish & Seafood", emoji: "🐟",
    keywords: ["seafood","fish","salmon","tuna","cod","haddock","sardine","sardines","prawn","prawns","shrimp","crab","lobster","mussel","mussels","squid","clams","oyster","oysters","scallop","scallops","anchovy","anchovies","trout","halibut","tilapia","mackerel","herring","seabass"],
  },
  {
    key: "vegetarian", label: "Vegetarian", emoji: "🥬",
    keywords: [], // matched by absence of all other primary categories
  },
  {
    key: "dessert", label: "Desserts", emoji: "🍰",
    keywords: ["dessert","cake","brownie","brownies","tart","cheesecake","pudding","mousse","crepe","crepes","donut","doughnut","muffin","muffins","cupcake","sorbet","gelato","tiramisu","macaron","meringue","trifle","flapjack","truffle","fudge","cookie","cookies","biscuit","biscuits","praline","pastry","pie","pavlova"],
  },
];

// All non-vegetarian keywords (used for vegetarian matching)
const ALL_NON_VEG_KW = CATEGORY_FILTERS.filter(c => c.key !== "vegetarian").flatMap(c => c.keywords);

function matchesFilter(tags: string[] | null, filterKey: string): boolean {
  const lowerTags = tags?.map(t => t.toLowerCase()) ?? [];
  // Direct key match (new-style tags with primary as first element)
  if (lowerTags.includes(filterKey)) return true;
  const cat = CATEGORY_FILTERS.find(c => c.key === filterKey);
  if (!cat) return false;
  if (filterKey === "vegetarian") {
    // Vegetarian = no meat/poultry/seafood/dessert keywords anywhere in tags
    return lowerTags.length === 0 ? false : !lowerTags.some(t => ALL_NON_VEG_KW.includes(t));
  }
  // Keyword match (backward compat with old tags like ["chicken","italian","pasta"])
  return cat.keywords.some(kw => lowerTags.includes(kw));
}
// ─────────────────────────────────────────────────────────────────────────────

function getEmoji(r: { cuisine_tags: string[] | null }) {
  const t = r.cuisine_tags?.[0]?.toLowerCase();
  return (t && CUISINE_EMOJI[t]) || "🍽️";
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayISO() { return toISO(new Date()); }
function getMonday(offsetWeeks: number): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDayHeader(iso: string, i: number) {
  const d = new Date(iso + "T12:00:00");
  return `${DAY_LABELS[i]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function formatDayFull(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${names[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function AppLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" width="32" height="32" alt="" aria-hidden />
  );
}

export default function WeekMenu({
  recipes,
  initialWeekData,
}: {
  recipes: Recipe[];
  initialWeekData: WeekData;
}) {
  const [mounted, setMounted] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState<WeekData>(initialWeekData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [pendingMealType, setPendingMealType] = useState("dinner");
  const [pendingFreeText, setPendingFreeText] = useState<string | null>(null);
  const [pendingFreeTextMealType, setPendingFreeTextMealType] = useState("dinner");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMealTab, setSelectedMealTab] = useState("dinner");
  const [daySearch, setDaySearch] = useState("");
  // Recipe Genie
  const [nestorPrompt, setNestorPrompt] = useState("");
  const [nestorLoading, setNestorLoading] = useState(false);
  const [nestorResults, setNestorResults] = useState<NestorSuggestion[]>([]);
  const [nestorError, setNestorError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const monday = getMonday(weekOffset);
  const weekStart = toISO(monday);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/menu?week_start=${weekStart}`);
      if (r.ok) setWeekData(await r.json());
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => {
    if (!mounted) return;
    if (weekOffset === 0) {
      setWeekData(initialWeekData);
      setLoading(false);
      return;
    }
    fetchWeek();
  }, [mounted, weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mounted) { setSearch(""); setPendingRecipe(null); setActiveFilters([]); setSearchOpen(false); }
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addDish(day: string, meal: string, recipe: Recipe) {
    setPendingRecipe(null);
    setSearch(""); setSearchOpen(false); setActiveFilters([]);
    setDragOver(null); setDaySearch("");
    await fetch("/api/menu/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart, day_date: day, meal_type: meal, recipe_id: recipe.id }),
    });
    fetchWeek();
  }

  async function addFreeDish(day: string, meal: string, text: string) {
    setPendingFreeText(null);
    await fetch("/api/menu/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart, day_date: day, meal_type: meal, free_text: text }),
    });
    fetchWeek();
  }

  async function removeDish(id: string) {
    await fetch(`/api/menu/dishes/${id}`, { method: "DELETE" });
    fetchWeek();
  }

  async function askNestor() {
    if (!nestorPrompt.trim() || nestorLoading) return;
    setNestorLoading(true);
    setNestorError(null);
    setNestorResults([]);
    try {
      const r = await fetch("/api/nestor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nestorPrompt }),
      });
      const data = await r.json();
      if (data.suggestions?.length) {
        setNestorResults(data.suggestions);
      } else {
        setNestorError(data.error ?? "No ideas came back. Try different words!");
      }
    } catch {
      setNestorError("Couldn't reach Recipe Genie. Check your connection.");
    } finally {
      setNestorLoading(false);
    }
  }

  function getDayDishes(day: string, mealType?: string) {
    return weekData.slots
      .filter(s => s.day_date === day && (mealType ? s.meal_type === mealType : true))
      .flatMap(s => s.dishes.map(d => ({ ...d, mealType: s.meal_type })));
  }

  const isSearchActive = searchOpen || search.trim().length > 0 || activeFilters.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    const q = search.trim().toLowerCase();
    return recipes.filter(r => {
      const matchText = q ? r.name.toLowerCase().includes(q) : true;
      const matchCat  = activeFilters.length > 0
        ? activeFilters.some(f => matchesFilter(r.cuisine_tags, f))
        : true;
      return matchText && matchCat;
    }).slice(0, 30);
  }, [searchOpen, search, activeFilters, recipes]); // eslint-disable-line react-hooks/exhaustive-deps

  const daySearchResults = useMemo(() => {
    const q = daySearch.trim().toLowerCase();
    if (!q) return recipes.slice(0, 30);
    return recipes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 30);
  }, [daySearch, recipes]);

  function toggleFilter(tag: string) {
    setActiveFilters(prev => prev.includes(tag) ? prev.filter(f => f !== tag) : [...prev, tag]);
  }

  function openDayDetail(day: string) {
    setSelectedDay(day);
    setSelectedMealTab("dinner");
    setDaySearch("");
  }

  const todayStr = mounted ? todayISO() : "";
  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--mk-cream)" }}>

      {/* ── Banner ── */}
      <div style={{ background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)" }} className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-2.5 mb-0.5">
          <AppLogo />
          <span style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "-0.5px", lineHeight: 1 }}>
            <span style={{ color: "white" }}>Memory</span>
            <span style={{ color: "#FFE580" }}> Kitchen</span>
          </span>
        </div>
        <p className="text-xs font-medium mb-4 pl-9" style={{ color: "rgba(255,255,255,0.6)" }}>Maman, what&apos;s for dinner? 😊</p>

        <div ref={searchContainerRef} className="relative">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search recipes to add to your week…"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", color: "white" }}
          />
          {(search || activeFilters.length > 0) && (
            <button onClick={() => { setSearch(""); setActiveFilters([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm" aria-label="Clear">✕</button>
          )}
          {isSearchActive && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl overflow-hidden z-30"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
              {/* Fixed category filter chips */}
              <div className="px-3 pt-3 pb-2 border-b flex gap-2 overflow-x-auto"
                style={{ borderColor: "var(--mk-border)", scrollbarWidth: "none" }}>
                <button onClick={() => setActiveFilters([])}
                  className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: activeFilters.length === 0 ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: activeFilters.length === 0 ? "white" : "var(--mk-terracotta)" }}
                >All</button>
                {CATEGORY_FILTERS.map(cat => {
                  const active = activeFilters.includes(cat.key);
                  return (
                    <button key={cat.key} onClick={() => toggleFilter(cat.key)}
                      className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: active ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: active ? "white" : "var(--mk-terracotta)" }}
                    >{cat.emoji} {cat.label}</button>
                  );
                })}
              </div>
              {!search.trim() && activeFilters.length === 0 && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
                  Browse all · {recipes.length} recipes
                </p>
              )}
              {(search.trim() || activeFilters.length > 0) && (() => {
                const totalMatches = recipes.filter(r => {
                  const q = search.trim().toLowerCase();
                  const matchText = q ? r.name.toLowerCase().includes(q) : true;
                  const matchCat  = activeFilters.length > 0
                    ? activeFilters.some(f => matchesFilter(r.cuisine_tags, f))
                    : true;
                  return matchText && matchCat;
                }).length;
                return (
                  <p className="px-3 pt-2 pb-1 text-[10px]" style={{ color: "#bbb" }}>
                    {searchResults.length} of {totalMatches}{search.trim() ? ` matching "${search.trim()}"` : ""}{totalMatches > searchResults.length ? " — type to narrow" : ""}
                  </p>
                );
              })()}
              {searchResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map(r => (
                    <div key={r.id} draggable
                      onDragStart={e => { e.dataTransfer.setData("recipe-id", r.id); e.dataTransfer.effectAllowed = "copy"; }}
                      onClick={() => { setPendingRecipe(r); setPendingMealType("dinner"); setSearch(""); setSearchOpen(false); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-neutral-50"
                      style={{ borderColor: "var(--mk-border)" }}
                    >
                      <span className="text-lg flex-shrink-0">{getEmoji(r)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1a1a1a" }}>{r.name}</p>
                        {r.cuisine_tags?.[0] && <p className="text-[10px] capitalize" style={{ color: "#bbb" }}>{r.cuisine_tags[0]}</p>}
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "#ccc" }}>tap to plan</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-4 text-xs text-neutral-400 text-center">No recipes found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Week nav ── */}
      <div className="bg-white border-b px-5 py-3 flex items-center justify-between" style={{ borderColor: "var(--mk-border)" }}>
        <button onClick={() => setWeekOffset(o => Math.max(-2, o - 1))} disabled={weekOffset <= -2}
          className="text-xs font-semibold disabled:opacity-25" style={{ color: "var(--mk-terracotta)" }}>← prev</button>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : weekOffset === 1 ? "Next week"
            : weekOffset < 0 ? `${Math.abs(weekOffset)}w ago` : `In ${weekOffset}w`}
        </span>
        <button onClick={() => setWeekOffset(o => Math.min(2, o + 1))} disabled={weekOffset >= 2}
          className="text-xs font-semibold disabled:opacity-25" style={{ color: "var(--mk-terracotta)" }}>next →</button>
      </div>

      {/* ── Day cards ── */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading ? (
          Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border px-4 py-3 animate-pulse" style={{ borderColor: "var(--mk-border)" }}>
              <div className="h-3 w-20 bg-neutral-100 rounded mb-2" />
              <div className="h-4 w-36 bg-neutral-100 rounded" />
            </div>
          ))
        ) : weekDays.map((day, i) => {
          const dinnerDishes = getDayDishes(day, "dinner");
          const sidesDishes  = getDayDishes(day, "sides");
          const lunchDishes  = getDayDishes(day, "lunch");
          const bfDishes     = getDayDishes(day, "breakfast");
          const anyDishes    = dinnerDishes.length + sidesDishes.length + lunchDishes.length + bfDishes.length > 0;
          const isToday = day === todayStr;
          const isPast  = day < todayStr;
          const isDragTarget = dragOver === day && !isPast;

          return (
            <div key={day}
              className="bg-white rounded-xl overflow-hidden"
              style={{
                opacity: isPast ? 0.45 : 1,
                border: isDragTarget ? "2px dashed var(--mk-terracotta)"
                  : isToday ? "1.5px solid var(--mk-terracotta)"
                  : "1px solid var(--mk-border)",
                background: isDragTarget ? "rgba(212,160,23,0.06)" : undefined,
              }}
              onDragOver={e => { if (!isPast) { e.preventDefault(); setDragOver(day); } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
              onDrop={e => {
                e.preventDefault();
                if (isPast) { setDragOver(null); return; }
                const id = e.dataTransfer.getData("recipe-id");
                const r = recipes.find(r => r.id === id);
                if (r) addDish(day, "dinner", r); else setDragOver(null);
              }}
              onClick={() => !isPast && openDayDetail(day)}
            >
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: isToday ? "var(--mk-terracotta)" : "#999" }}>
                    {formatDayHeader(day, i)}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--mk-terracotta)", color: "white" }}>Today</span>
                  )}
                  {!isPast && (
                    <span className="ml-auto text-[10px]" style={{ color: "#ddd" }}>
                      {anyDishes ? "tap to edit" : "tap to plan"}
                    </span>
                  )}
                </div>
                {isDragTarget && !anyDishes ? (
                  <p className="text-xs font-semibold" style={{ color: "var(--mk-terracotta)" }}>Drop to add dinner</p>
                ) : !anyDishes ? (
                  <p className="text-xs" style={{ color: "#ccc" }}>{isPast ? "Nothing was planned" : "Nothing planned yet"}</p>
                ) : (
                  <div className="space-y-1">
                    {dinnerDishes.map(d => (
                      <div key={d.id} className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] flex-shrink-0">🍽️</span>
                        {d.recipe_id ? (
                          <Link href={`/recipes/${d.recipe_id}`}
                            className="text-sm font-semibold truncate flex-1 underline-offset-2 hover:underline"
                            style={{ color: "#1a1a1a" }}>
                            {d.recipes?.name ?? d.free_text ?? "Dish"}
                          </Link>
                        ) : (
                          �[��\�Ә[YOH�^\�H�۝\�[ZX���[��]H�^LH��[O^����܎���XLXLXH�_O�����YW�^���\��O��[���
_B��]ۈې�X��^�
HO��[[ݙQ\�
�Y
_B��\�Ә[YOH�^[�]]�[L�ݙ\��^\�YM^^XY[��[�ۙH�^\��[��L�[��][ۋX��ܜȈ\�XK[X�[H��[[ݙH����؝]ۏ���]���
J_B���Y\�\�\˛X\
O�
�]��^O^��YH�\�Ә[YOH��^][\�X�[�\��\LK�H�ې�X��^�HO�K�����Y�][ۊ
_O���[��\�Ә[YOH�^V�L\H�^\��[��L��'�e���[������X�\W�Y�
�[���Y�^�ܙX�\\�����X�\W�YXH�\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����X�\\�˛�[YH�����YW�^����YH�B��[�ς�
H�
��[��\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����YW�^����YH�O��[���
_B��]ۈې�X��^�
HO��[[ݙQ\�
�Y
_B��\�Ә[YOH�^[�]]�[L�ݙ\��^\�YM^^XY[��[�ۙH�^\��[��L�[��][ۋX��ܜȈ\�XK[X�[H��[[ݙH����؝]ۏ���]���
J_B��[��\�\˛X\
O�
�]��^O^��YH�\�Ә[YOH��^][\�X�[�\��\LK�H�ې�X��^�HO�K�����Y�][ۊ
_O���[��\�Ә[YOH�^V�L\H�^\��[��L��� ;�#���[������X�\W�Y�
�[���Y�^�ܙX�\\�����X�\W�YXH�\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����X�\\�˛�[YH�����YW�^���[���B��[�ς�
H�
��[��\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����YW�^���[���O��[���
_B��]ۈې�X��^�
HO��[[ݙQ\�
�Y
_B��\�Ә[YOH�^[�]]�[L�ݙ\��^\�YM^^XY[��[�ۙH�^\��[��L�[��][ۋX��ܜȈ\�XK[X�[H��[[ݙH����؝]ۏ���]���
J_B�ؙ�\�\˛X\
O�
�]��^O^��YH�\�Ә[YOH��^][\�X�[�\��\LK�H�ې�X��^�HO�K�����Y�][ۊ
_O���[��\�Ә[YOH�^V�L\H�^\��[��L��'�!O��[������X�\W�Y�
�[���Y�^�ܙX�\\�����X�\W�YXH�\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����X�\\�˛�[YH�����YW�^�����XZ٘\��B��[�ς�
H�
��[��\�Ә[YOH�^\�H�[��]H�^LH��[O^����܎���MMH�_O�����YW�^�����XZ٘\��O��[���
_B��]ۈې�X��^�
HO��[[ݙQ\�
�Y
_B��\�Ә[YOH�^[�]]�[L�ݙ\��^\�YM^^XY[��[�ۙH�^\��[��L�[��][ۋX��ܜȈ\�XK[X�[H��[[ݙH����؝]ۏ���]���
J_B��\��Y�\��]	��
��\�Ә[YOH�^^��۝\�[ZX��L�H��[O^����܎���\�K[Z�]\��X��JH�_O�����Y[��\����
_B��]���
_B��]����]���
NJ_B���ʈ8� 8� �X�\H�[�YH8� 8� 
��B��[�Y[��	��
�]��\�Ә[YOH�]M����]��\�Ә[YOH���[�Y^ݙ\����ZY[���[O^���ܙ\���K�\��Y�P�QL�H�_O���ʈXY\���\
��B�]��\�Ә[YOH�MKL��^][\�X�[�\��\L��H���[O^���X��ܛ�[���[�X\�YܘYY[�
L�YY��P�QL�H	K̑M�L�HL	JH�_O���[��[O^���۝�^�N�������܎��ё�MN�[�RZY��H_O��)���[���]����[O^���۝�ZY��L�۝�^�N�����]\��X�[�Έ�L�\�[�RZY��K��܎���]H�_O��X�\H�[�YO����\�Ә[YOH�^V�LH]L�H��[O^����܎���ؘJ�MK�MK�MK��H�_O��K�ˈ	�][���\�[�\�[�\�I�][��܈	�][��]ZX���X��[�[��\��][�����]����]����ʈ[�]\�XH
��B�]��\�Ә[YOH�MKLȈ�[O^���X��ܛ�[���ь�ь��_O��]��\�Ә[YOH��^�\L����[�]�\OH�^���[YO^ۙ\�ܔ��\B�ې�[��O^�HO��]�\�ܔ��\
K�\��]��[YJ_B�ے�^Q�ۏ^�HO�K��^HOOH�[�\��	��\�ә\�܊
_B�X�Z�\�H��]	��[�[�\��]�[�Ȃ��\�Ә[YOH��^LH��[�Y^L�KL��H^\�H�][�K[�ۙH���[O^���X��ܛ�[����]H��ܙ\���\��Y�ؘJ��M

���JH���܎���XLXLXH�_B�ς��]ۂ�ې�X��^�\�ә\�ܟB�\�X�Y^ۙ\�ܓ�Y[��[�\�ܔ��\��[J
_B��\�Ә[YOH�MKL��H��[�Y^^\�H�۝X���[��][ۋ[�X�]H\�X�Y��X�]KM�^\��[��L���[O^���X��ܛ�[����\�K[Z�]\��X��JH���܎���]H�_B���ۙ\�ܓ�Y[�����)������8����B�؝]ۏ���]���ۙ\�ܓ�Y[��	��
��\�Ә[YOH�^^�]L�[�[X]K\[�H��[O^����܎���P�QL�H�_O��X�\H�[�YH\�[��[���)����
_B�ۙ\�ܑ\��܈	��
��\�Ә[YOH�^^�]L���[O^����܎���\�K[Z�]\��X��JH�_O�ۙ\�ܑ\��ܟO���
_B�ۙ\�ܔ�\�[˛[���	��
�]��\�Ә[YOH�]L��X�K^KL����ۙ\�ܔ�\�[˛X\

�JHO�
�]��^O^�_H�\�Ә[YOH���[�Y^L�KLȂ��[O^���X��ܛ�[����]H��ܙ\���\��Y�ؘJ��M

��N
H�_O��]��\�Ә[YOH��^][\�\�\��\�Y�KX�]�Y[��\L�X�LH����\�Ә[YOH�^\�H�۝X��XY[��\۝YȈ�[O^����܎���XLXLXH�_O�܋��[Y_O���܋�����[YH	���[��\�Ә[YOH�^V�LH^[�]]�[M�^\��[��L]L�H��܋�����[Y_O��[��B��]����\�Ә[YOH�^^�^[�]]�[MLXY[��\�[^YX�L��H��܋�\�ܚ\[۟O����]ۂ�ې�X��^�
HO���][�[�ќ�YU^
���[YJN��][�[�ќ�YU^YX[\J�[��\��N�_B��\�Ә[YOH�^^��۝X��L�KLK�H��[�Y[Ȃ��[O^���X��ܛ�[����\�K[Z�]\��X��JH���܎���]H�_B���[�]؝]ۏ���]���
J_B��]���
_B��]����]����]���
_B�]��\�Ә[YOH�M�ς��]�����ʈ8� 8� ^H]Z[���H�Y]8� 8� 
��B� ��[X�Y^H	��
�]��\�Ә[YOH��^Y[��]L�ML�^][\�Y[���[O^���X��ܛ�[����ؘJ�JH�_B�ې�X��^�
HO��]�[X�Y^J�[
_O��]��\�Ә[YOH���]�]H��[�Y]L��Y�[�^�^X�����[O^�����Y�Έ�M��ؘJ�MJH�X^ZY���
]��_B�ې�X��^�HO�K�����Y�][ۊ
_O��]��\�Ә[YOH�MHMH�L��ܙ\�X��^\��[��L��[O^���ܙ\���܎���\�K[Z�X�ܙ\�H�_O��]��\�Ә[YOH��^][\�X�[�\��\�Y�KX�]�Y[�X�Lȏ����\�Ә[YOH��۝X��^[�]]�[N��ٛܛX]^Q�[
�[X�Y^J_O�����]ۈې�X��^�
HO��]�[X�Y^J�[
_H�\�Ә[YOH�^[�]]�[M^L��NN�^][\�X�[�\��\�Y�KX�[�\�����؝]ۏ���]���]��\�Ә[YOH��^�\LK�H����QPS�P�˛X\
X�O��ۜ���[�H�]^Q\�\��[X�Y^KX���^JK�[���ۜ�\�X�]�HH�[X�YYX[X�OOHX���^N          return (
                    <button key={tab.key} onClick={() => setSelectedMealTab(tab.key)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-col/rs"
                      style={{ background: isActive ? "var(--mk-terracotta)" : "rgba(212,160,23,0.1)", color: isActive ? "white" : "var(--mk-terracotta)" }}>
                      <span>{tab.icon}</span><span>{tab.label}</span>
                      {count > 0 && (
                        <span className="text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: isActive ? "rgba(255,255,255,0.35)" : "var(--mk-terracotta)", color: "white" }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(() => {
                const dishes = getDayDishes(selectedDay, selectedMealTab);
                const tab = MEAL_TABS.find(t => t.key === selectedMealTab);
                return dishes.length > 0 ? (
                  <div className="space-y-2 mb-5">
                    {dishes.map(d => (
                      <div key={d.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                        style={{ borderColor: "var(--mk-border)", background: "var(--mk-cream)" }}>
                        <span className="text-lg flex-shrink-0">{d.recipes ? getEmoji(d.recipes) : tab?.icon ?? "🍽️"}</span>
                        <div className="flex-1 min-w-0">
                          {d.recipe_id ? (
                            <Link href={`/recipes/${d.recipe_id}`} onClick={() => setSelectedDay(null)}
                              className="text-sm font-semibold truncate block underline-offset-2 hover:underline" style={{ color: "#1a1a1a" }}>
                              {d.recipes?.name ?? d.free_text ?? "Recipe"}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>{d.free_text ?? "Dish"}</p>
                          )}
                          {d.recipes?.cuisine_tags?.[0] && (
                            <p className="text-[10px] capitalize text-neutral-400">{d.recipes.cuisine_tags[0]}</p>
                          )}
                        </div>
                        <button onClick={() => removeDish(d.id)}
                          className="text-neutral-300 hover:text-red-400 text-xl leading-none flex-shrink-0 transition-colors" aria-label="Remove">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-2 mb-4">No {tab?.label.toLowerCase() ?? selectedMealTab} planned yet</p>
                );
              })()}
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#aaa" }}>
                Add to {MEAL_TABS.find(t => t.key === selectedMealTab)?.label}
              </p>
              <input type="text" value={daySearch} onChange={e => setDaySearch(e.target.value)}
                placeholder="Search recipes…" className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none mb-3"
                style={{ borderColor: "var(--mk-border)", background: "white" }} />
              <div className="space-y-1.5">
                {daySearchResults.map(r => {
                  const alreadyAdded = getDayDishes(selectedDay, selectedMealTab).some(d => d.recipe_id === r.id);
                  return (
                    <button key={r.id} onClick={() => !alreadyAdded && addDish(selectedDay, selectedMealTab, r)}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 border text-left transition-colors"
                      style={{ borderColor: "var(--mk-border)", background: alreadyAdded ? "rgba(212,160,23,0.06)" : "white", opacity: alreadyAdded ? 0.6 : 1 }}>
                      <span className="text-base flex-shrink-0">{getEmoji(r)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1a1a1a" }}>{r.name}</p>
                        {r.cuisine_tags?.[0] && <p className="text-[10px] capitalize text-neutral-400">{r.cuisine_tags[0]}</p>}
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: alreadyAdded ? "#bbb" : "var(--mk-terracotta)" }}>
                        {alreadyAdded ? "✓ Added" : "+ Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pick day for recipe from search ── */}
      {pendingRecipe && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPendingRecipe(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full" style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{getEmoji(pendingRecipe)}</span>
              <div>
                <p className="font-bold text-neutral-800 leading-snug">{pendingRecipe.name}</p>
                <p className="text-xs text-neutral-400">Choose meal type then a day</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {MEAL_TABS.map(tab => (
                <button key={tab.key} onClick={() => setPendingMealType(tab.key))}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1"
                  style={{ background: pendingMealType === tab.key ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: pendingMealType === tab.key ? "white" : "var(--mk-terracotta)" }}>
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {weekDays.map((iso, i) => {
                const isToday = iso === todayStr;
                const isPast = iso < todayStr;
               "&WGW&����'WGF���W�׶�6��F�6&�VC׶�57GТ��6Ɩ6�ײ�����57BbbFDF�6���6��V�F��t�V�G�R�V�F��u&V6�R�Т6�74��S�&f�W�f�W��6���FV�2�6V�FW"��"��&�V�FVB׆�G&�6�F������7F�fS�66�RӓRF�6&�VC��6�G��C �7G��S׷�&6�w&�V�C��5F�F��'f"���ֲ�FW'&6�GF�"��57B�'&v&�����B�"�'&v&�#"�c�#2���"�6���#��5F�F��'v��FR"��57B�"6&&""�'f"���ֲ�FW'&6�GF�"����7�6�74��S�'FW�Bճ��f��B�&��B#�D���$T�5������7���7�6�74��S�'FW�B�&6Rf��B�&��B�VF��r�F�v�B#��WrFFR��6��%C#��"��vWDFFR�����7����'WGF������җТ��F�c��'WGF����6Ɩ6�ײ����6WEV�F��u&V6�R��V��6�74��S�'r�gV����"FW�B�6�FW�B��WWG&��C#�6�6V���'WGF�����F�c���F�c��Р���)H)H�6�F�f�"&V6�RvV�Rg&VR�FW�B7VvvW7F���)H)H��Т�V�F��tg&VUFW�Bbb���F�b6�74��S�&f��VB��6WB���Sf�W��FV�2�V�B"7G��S׷�&6�w&�V�C�'&v&�����R�"�Т��6Ɩ6�ײ����6WEV�F��tg&VUFW�B��V����F�b6�74��S�&&r�v��FR&�V�FVB�B�'���Rr�gV��"7G��S׷�&��6�F�s�#�G�3�&v&�����R�"�Т��6Ɩ6�׶R��R�7F�&�vF��ₗ���F�b6�74��S�&f�W��FV�2�6V�FW"v�2�"�B#��7�6�74��S�'FW�B�7��#�)�c��7���F�c��6�74��S�&f��B�&��BFW�B��WWG&�Ӄ�VF��r�6�Vr#�V�F��tg&VUFW�G�����6�74��S�'FW�Bׇ2FW�B��WWG&��C#�6���6R�V�G�RF�V�F������F�c���F�c��F�b6�74��S�&f�W�v�"�"�Bf�W��w&#���T��D%2���F"�����'WGF���W�׷F"�W����6Ɩ6�ײ����6WEV�F��tg&VUFW�D�V�G�R�F"�W��Т6�74��S�'FW�Bׇ2��2���R&�V�FVB�gV��f��B�6V֖&��BG&�6�F����6���'2f�W��FV�2�6V�FW"v� �7G��S׷�&6�w&�V�C�V�F��tg&VUFW�D�V�G�R���F"�W��'f"���ֲ�FW'&6�GF�"�'&v&�#"�c�#2��2�"�6���#�V�F��tg&VUFW�D�V�G�R���F"�W��'v��FR"�'f"���ֲ�FW'&6�GF�"����7��F"�6�����7���F"��&V�Т��'WGF�����Т��F�c��F�b6�74��S�&w&�Bw&�B�6��2�rv��R�"�R#��vVV�F�2�����6��������6��7B�5F�F���6����F�F�7G#��6��7B�57B��6��F�F�7G#��&WGW&����'WGF���W�׶�6��F�6&�VC׶�57GТ��6Ɩ6�ײ�����57BbbFDg&VTF�6���6��V�F��tg&VUFW�D�V�G�R�V�F��tg&VUFW�B�Т6�74��S�&f�W�f�W��6���FV�2�6V�FW"��"��&�V�FVB׆�G&�6�F������7F�fS�66�RӓRF�6&�VC��6�G��C �7G��S׷�&6�w&�V�C��5F�F��'f"���ֲ�FW'&6�GF�"��57B�'&v&�����B�"�'&v&�#"�c�#2���"�6���#��5F�F��'v��FR"��57B�"6&&""�'f"���ֲ�FW'&6�GF�"����7�6�74��S�'FW�Bճ��f��B�&��B#�D���$T�5������7���7�6�74��S�'FW�B�&6Rf��B�&��B�VF��r�F�v�B#��WrFFR��6��%C#��"��vWDFFR�����7����'WGF������җТ��F�c��'WGF����6Ɩ6�ײ����6WEV�F��tg&VUFW�B��V��6�74��S�'r�gV����"FW�B�6�FW�B��WWG&��C#�6�6V���'WGF�����F�c���F�c��Т��F�c����
