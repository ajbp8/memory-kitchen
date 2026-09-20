import { createClient } from "@/lib/supabase/server";
import WeekMenu from "@/components/WeekMenu";

type Dish = { id: string; recipe_id: string | null; free_text: string | null; recipes?: { name: string; cuisine_tags: string[] | null } | null };
type Slot = { id: string; day_date: string; meal_type: string; dishes: Dish[] };
type WeekData = { week_id: string | null; slots: Slot[] };

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = getMondayISO();

  // Fetch membership + recipes in parallel (both only need user.id)
  const [{ data: membership }, { data: recipesRaw }] = await Promise.all([
    supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("recipes")
      .select("id, name, cuisine_tags")
      .eq("owner_id", user.id)
      .order("name"),
  ]);

  const recipes = recipesRaw ?? [];

  // Pre-fetch current week's menu data server-side to avoid client waterfall.
  // Week navigation (prev/next) still fetches client-side via /api/menu.
  let initialWeekData: WeekData = { week_id: null, slots: [] };

  if (membership?.family_id) {
    const { data: week } = await supabase
      .from("menu_weeks")
      .select(`
        id,
        menu_slots (
          id, day_date, meal_type,
          menu_dishes (
            id, recipe_id, free_text, sort_order,
            recipes ( name, cuisine_tags )
          )
        )
      `)
      .eq("family_id", membership.family_id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (week) {
      initialWeekData = {
        week_id: week.id,
        slots: ((week.menu_slots ?? []) as any[]).map((s: any) => ({
          id: s.id,
          day_date: s.day_date,
          meal_type: s.meal_type,
          dishes: ((s.menu_dishes ?? []) as any[])
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((d: any) => ({
              id: d.id,
              recipe_id: d.recipe_id,
              free_text: d.free_text,
              recipes: d.recipes ?? null,
            })),
        })),
      };
    }
  }

  return <WeekMenu recipes={recipes} initialWeekData={initialWeekData} />;
}
