"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

type Recipe = { id: string; name: string; meal_category: string | null; cuisine_tags: string[] | null };
type Dish = { id: string; recipe_id: string | null; free_text: string | null; recipes?: { name: string; meal_category: string | null; cuisine_tags: string[] | null } | null };
type Slot = { id: string; day_date: string; meal_type: string; dishes: Dish[] };
type WeekData = { week_id: string | null; slots: Slot[] };
type NestorSuggestion = { name: string; description: string; cookTime?: string };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CUISINE_EMOJI: Record<string, string> = {
  italian: "🍝", mexican: "🌮", indian: "🍛", chinese: "🥡", japanese: "🍣",
  thai: "🍜", french: "🥐", mediterranean: "🥙", american: "🍔",
  "middle-eastern": "🫙", dessert: "🍰", baking: "🍞",
};
const MEAL_TABS = [
  { key: "dinner",    label: "Dinner",    icon: "🍽️" },
  { key: "sides",     label: "Sides",     icon: "🥗" },
  { key: "lunch",     label: "Lunch",     icon: "☀️" },
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
];

function getEmoji(r: { cuisine_tags: string[] | null; meal_category: string | null }) {
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
          <img src="/icon-192.png" width="32" height="32" alt="" aria-hidden style={{ borderRadius: "7px" }} />
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
  // Nestor
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

  const cuisineOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    recipes.forEach(r => r.cuisine_tags?.forEach(t => {
      const key = t.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
  }, [recipes]);

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
      setNestorError("Couldn't reach Nestor. Check your connection.");
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
      const matchCuisine = activeFilters.length > 0
        ? activeFilters.some(f => r.cuisine_tags?.map(t => t.toLowerCase()).includes(f))
        : true;
      return matchText && matchCuisine;
    }).slice(0, 12);
  }, [searchOpen, search, activeFilters, recipes]); // eslint-disable-line react-hooks/exhaustive-deps

  const daySearchResults = useMemo(() => {
    const q = daySearch.trim().toLowerCase();
    if (!q) return recipes.slice(0, 12);
    return recipes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 12);
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
        <p className="text-xs font-medium mb-4 pl-9" style={{ color: "rgba(255,255,255,0.6)" }}>Maman, what's for dinner? 😊</p>

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
              {cuisineOptions.length > 0 && (
                <div className="px-3 pt-3 pb-2 border-b flex gap-2 overflow-x-auto"
                  style={{ borderColor: "var(--mk-border)", scrollbarWidth: "none" }}>
                  <button onClick={() => setActiveFilters([])}
                    className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full"
                    style={{ background: activeFilters.length === 0 ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: activeFilters.length === 0 ? "white" : "var(--mk-terracotta)" }}
                  >All</button>
                  {cuisineOptions.map(tag => {
                    const active = activeFilters.includes(tag);
                    return (
                      <button key={tag} onClick={() => toggleFilter(tag)}
                        className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full capitalize"
                        style={{ background: active ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: active ? "white" : "var(--mk-terracotta)" }}
                      >{CUISINE_EMOJI[tag] ?? "🍽️"} {tag}</button>
                    );
                  })}
                </div>
              )}
              {!search.trim() && activeFilters.length === 0 && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
                  Browse all · {recipes.length} recipes
                </p>
              )}
              {(search.trim() || activeFilters.length > 0) && (
                <p className="px-3 pt-2 pb-1 text-[10px]" style={{ color: "#bbb" }}>
                  {searchResults.length} of {recipes.length}{search.trim() ? ` matching "${search.trim()}"` : ""}
                </p>
              )}
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
                          <span className="text-sm font-semibold truncate flex-1" style={{ color: "#1a1a1a" }}>{d.free_text ?? "Dish"}</span>
                        )}
                        <button onClick={() => removeDish(d.id)}
                          className="text-neutral-200 hover:text-red-400 text-xl leading-none flex-shrink-0 transition-colors" aria-label="Remove">×</button>
                      </div>
                    ))}
                    {sidesDishes.map(d => (
                      <div key={d.id} className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] flex-shrink-0">🥗</span>
                        {d.recipe_id ? (
                          <Link href={`/recipes/${d.recipe_id}`} className="text-sm truncate flex-1" style={{ color: "#555" }}>
                            {d.recipes?.name ?? d.free_text ?? "Side"}
                          </Link>
                        ) : (
                          <span className="text-sm truncate flex-1" style={{ color: "#555" }}>{d.free_text ?? "Side"}</span>
                        )}
                        <button onClick={() => removeDish(d.id)}
                          className="text-neutral-200 hover:text-red-400 text-xl leading-none flex-shrink-0 transition-colors" aria-label="Remove">×</button>
                      </div>
                    ))}
                    {lunchDishes.map(d => (
                      <div key={d.id} className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] flex-shrink-0">☀️</span>
                        {d.recipe_id ? (
                          <Link href={`/recipes/${d.recipe_id}`} className="text-sm truncate flex-1" style={{ color: "#555" }}>
                            {d.recipes?.name ?? d.free_text ?? "Lunch"}
                          </Link>
                        ) : (
                          <span className="text-sm truncate flex-1" style={{ color: "#555" }}>{d.free_text ?? "Lunch"}</span>
                        )}
                        <button onClick={() => removeDish(d.id)}
                          className="text-neutral-200 hover:text-red-400 text-xl leading-none flex-shrink-0 transition-colors" aria-label="Remove">×</button>
                      </div>
                    ))}
                    {bfDishes.map(d => (
                      <div key={d.id} className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] flex-shrink-0">🌅</span>
                        {d.recipe_id ? (
                          <Link href={`/recipes/${d.recipe_id}`} className="text-sm truncate flex-1" style={{ color: "#555" }}>
                            {d.recipes?.name ?? d.free_text ?? "Breakfast"}
                          </Link>
                        ) : (
                          <span className="text-sm truncate flex-1" style={{ color: "#555" }}>{d.free_text ?? "Breakfast"}</span>
                        )}
                        <button onClick={() => removeDish(d.id)}
                          className="text-neutral-200 hover:text-red-400 text-xl leading-none flex-shrink-0 transition-colors" aria-label="Remove">×</button>
                      </div>
                    ))}
                    {isDragTarget && (
                      <p className="text-xs font-semibold pt-0.5" style={{ color: "var(--mk-terracotta)" }}>+ Drop to add dinner</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Nestor ── */}
        {!loading && (
          <div className="mt-1">
            <div className="bg-white rounded-xl border px-4 py-4" style={{ borderColor: "var(--mk-border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: "18px", color: "#1B5E2E" }}>✦</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1B5E2E" }}>Ask Nestor</p>
                  <p className="text-[10px] text-neutral-400">e.g. "sardines and pasta" or "quick chicken dinner"</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nestorPrompt}
                  onChange={e => setNestorPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askNestor()}
                  placeholder="What's in your kitchen?"
                  className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none"
                  style={{ borderColor: "var(--mk-border)" }}
                />
                <button
                  onClick={askNestor}
                  disabled={nestorLoading || !nestorPrompt.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40 flex-shrink-0"
                  style={{ background: "var(--mk-terracotta)", color: "white" }}
                >
                  {nestorLoading ? "…" : "GO →"}
                </button>
              </div>
              {nestorLoading && (
                <p className="text-xs text-neutral-400 mt-2 animate-pulse">Nestor is thinking…</p>
              )}
              {nestorError && (
                <p className="text-xs mt-2" style={{ color: "var(--mk-terracotta)" }}>{nestorError}</p>
              )}
              {nestorResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {nestorResults.map((r, i) => (
                    <div key={i} className="rounded-xl border px-3 py-3" style={{ borderColor: "var(--mk-border)", background: "var(--mk-cream)" }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold leading-snug" style={{ color: "#1a1a1a" }}>{r.name}</p>
                        {r.cookTime && <span className="text-[10px] text-neutral-400 flex-shrink-0 mt-0.5">{r.cookTime}</span>}
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed mb-2.5">{r.description}</p>
                      <button
                        onClick={() => { setPendingFreeText(r.name); setPendingFreeTextMealType("dinner"); }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: "var(--mk-terracotta)", color: "white" }}
                      >+ Plan it</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="h-4" />
      </div>

      {/* ── Day detail bottom sheet ── */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-t-2xl w-full flex flex-col"
            style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.15)", maxHeight: "85vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: "var(--mk-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-neutral-800">{formatDayFull(selectedDay)}</h2>
                <button onClick={() => setSelectedDay(null)} className="text-neutral-400 text-2xl w-8 h-8 flex items-center justify-center">×</button>
              </div>
              <div className="flex gap-1.5">
                {MEAL_TABS.map(tab => {
                  const count = getDayDishes(selectedDay, tab.key).length;
                  const isActive = selectedMealTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setSelectedMealTab(tab.key)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
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
                <button key={tab.key} onClick={() => setPendingMealType(tab.key)}
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
                return (
                  <button key={iso} disabled={isPast}
                    onClick={() => !isPast && addDish(iso, pendingMealType, pendingRecipe)}
                    className="flex flex-col items-center py-2 px-1 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: isToday ? "var(--mk-terracotta)" : isPast ? "rgba(0,0,0,0.04)" : "rgba(212,160,23,0.1)", color: isToday ? "white" : isPast ? "#bbb" : "var(--mk-terracotta)" }}>
                    <span className="text-[10px] font-bold">{DAY_LABELS[i]}</span>
                    <span className="text-base font-bold leading-tight">{new Date(iso + "T12:00:00").getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPendingRecipe(null)} className="w-full py-2 text-sm text-neutral-400">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Pick day for Nestor free-text suggestion ── */}
      {pendingFreeText && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPendingFreeText(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full" style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✦</span>
              <div>
                <p className="font-bold text-neutral-800 leading-snug">{pendingFreeText}</p>
                <p className="text-xs text-neutral-400">Choose meal type then a day</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {MEAL_TABS.map(tab => (
                <button key={tab.key} onClick={() => setPendingFreeTextMealType(tab.key)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1"
                  style={{ background: pendingFreeTextMealType === tab.key ? "var(--mk-terracotta)" : "rgba(212,160,23,0.13)", color: pendingFreeTextMealType === tab.key ? "white" : "var(--mk-terracotta)" }}>
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {weekDays.map((iso, i) => {
                const isToday = iso === todayStr;
                const isPast = iso < todayStr;
                return (
                  <button key={iso} disabled={isPast}
                    onClick={() => !isPast && addFreeDish(iso, pendingFreeTextMealType, pendingFreeText)}
                    className="flex flex-col items-center py-2 px-1 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: isToday ? "var(--mk-terracotta)" : isPast ? "rgba(0,0,0,0.04)" : "rgba(212,160,23,0.1)", color: isToday ? "white" : isPast ? "#bbb" : "var(--mk-terracotta)" }}>
                    <span className="text-[10px] font-bold">{DAY_LABELS[i]}</span>
                    <span className="text-base font-bold leading-tight">{new Date(iso + "T12:00:00").getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPendingFreeText(null)} className="w-full py-2 text-sm text-neutral-400">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
