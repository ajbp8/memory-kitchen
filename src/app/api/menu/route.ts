import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/menu?week_start=YYYY-MM-DD
// Returns the current family's menu week with all slots and dishes.
// Used by WeekMenu.tsx for week navigation (prev/next weeks).
// The current week is pre-fetched server-side in page.tsx to eliminate
// the client-side waterfall on initial load.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week_start");
  if (!weekStart) {
    return NextResponse.json({ error: "week_start required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ week_id: null, slots: [] });
  }

  // Fetch week + slots + dishes + recipe info in one nested query
  const { data: week } = await supabase
    .from("menu_weeks")
    .select(`
      id,
      menu_slots (
        id, day_date, meal_type,
        menu_dishes (
          id, recipe_id, free_text, sort_order,
          recipes ( name, meal_category, cuisine_tags )
        )
      )
    `)
    .eq("family_id", membership.family_id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!week) {
    return NextResponse.json({ week_id: null, slots: [] });
  }

  const slots = ((week.menu_slots ?? []) as any[]).map((s: any) => ({
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
  }));

  return NextResponse.json({ week_id: week.id, slots });
}
