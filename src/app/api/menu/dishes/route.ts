export const runtime = "edge";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "sides"];

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const dayDate  = typeof body.day_date  === "string" ? body.day_date  : "";
  const mealType = typeof body.meal_type === "string" ? body.meal_type : "";
  const recipeId = typeof body.recipe_id === "string" && body.recipe_id ? body.recipe_id : null;
  const freeText = typeof body.free_text === "string" ? body.free_text.trim() : "";

  if (!dayDate || !MEAL_TYPES.includes(mealType)) {
    return NextResponse.json({ error: "Missing day or meal type." }, { status: 400 });
  }
  if (!recipeId && !freeText) {
    return NextResponse.json({ error: "Pick a recipe or describe the dish." }, { status: 400 });
  }

  const supabase = await createClient();

  // Round-trip 1: auth + membership in parallel
  const [{ data: { user } }, ] = await Promise.all([
    supabase.auth.getUser(),
  ]);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: membership } = await supabase
    .from("family_members").select("family_id").eq("user_id", user.id).single();
  if (!membership) return NextResponse.json({ error: "No household." }, { status: 400 });

  const weekStart = mondayOf(dayDate);

  // Round-trip 2: upsert week (create if missing, return existing id)
  const { data: week, error: weekErr } = await supabase
    .from("menu_weeks")
    .upsert({ family_id: membership.family_id, week_start: weekStart }, { onConflict: "family_id,week_start" })
    .select("id").single();
  if (weekErr || !week) return NextResponse.json({ error: "Couldn't create week." }, { status: 400 });

  // Round-trip 3: upsert slot
  const { data: slot, error: slotErr } = await supabase
    .from("menu_slots")
    .upsert({ week_id: week.id, day_date: dayDate, meal_type: mealType }, { onConflict: "week_id,day_date,meal_type" })
    .select("id").single();
  if (slotErr || !slot) return NextResponse.json({ error: "Couldn't create slot." }, { status: 400 });

  // Round-trip 4: insert dish (no count needed — use max sort_order subquery via default 0)
  const { data: existing } = await supabase
    .from("menu_dishes").select("sort_order").eq("slot_id", slot.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { error: dishErr } = await supabase.from("menu_dishes").insert({
    slot_id: slot.id,
    recipe_id: recipeId,
    free_text: recipeId ? null : freeText,
    sort_order: (existing?.sort_order ?? -1) + 1,
  });
  if (dishErr) return NextResponse.json({ error: "Couldn't add dish." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
