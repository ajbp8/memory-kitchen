import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { mondayOf } from "@/lib/menu";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "sides"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const dayDate = typeof body.day_date === "string" ? body.day_date : "";
  const mealType = typeof body.meal_type === "string" ? body.meal_type : "";
  const recipeId =
    typeof body.recipe_id === "string" && body.recipe_id ? body.recipe_id : null;
  const freeText = typeof body.free_text === "string" ? body.free_text.trim() : "";

  if (!dayDate || !MEAL_TYPES.includes(mealType)) {
    return NextResponse.json({ error: "Missing day or meal type." }, { status: 400 });
  }
  if (!recipeId && !freeText) {
    return NextResponse.json(
      { error: "Pick a recipe or describe the dish." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "Join or create a household first." },
      { status: 400 }
    );
  }

  const weekStart = mondayOf(dayDate);

  let { data: week } = await supabase
    .from("menu_weeks")
    .select("id")
    .eq("family_id", membership.family_id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!week) {
    const { data: newWeek, error: weekError } = await supabase
      .from("menu_weeks")
      .insert({ family_id: membership.family_id, week_start: weekStart })
      .select("id")
      .single();
    if (weekError || !newWeek) {
      return NextResponse.json({ error: "Couldn't start this week's menu." }, { status: 400 });
    }
    week = newWeek;
  }

  let { data: slot } = await supabase
    .from("menu_slots")
    .select("id")
    .eq("week_id", week.id)
    .eq("day_date", dayDate)
    .eq("meal_type", mealType)
    .maybeSingle();

  if (!slot) {
    const { data: newSlot, error: slotError } = await supabase
      .from("menu_slots")
      .insert({ week_id: week.id, day_date: dayDate, meal_type: mealType })
      .select("id")
      .single();
    if (slotError || !newSlot) {
      return NextResponse.json({ error: "Couldn't create that meal slot." }, { status: 400 });
    }
    slot = newSlot;
  }

  const { count } = await supabase
    .from("menu_dishes")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slot.id);

  const { error: dishError } = await supabase.from("menu_dishes").insert({
    slot_id: slot.id,
    recipe_id: recipeId,
    free_text: recipeId ? null : freeText,
    sort_order: count ?? 0,
  });

  if (dishError) {
    return NextResponse.json({ error: "Couldn't add that dish." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
