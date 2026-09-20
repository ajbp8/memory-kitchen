import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Mirrors /api/menu/dishes: a signed-in user claims a dish for an event by
// picking one of their own recipes or typing free text, same recipe_id-or-
// free_text shape as menu_dishes. claimed_by = the signed-in user, which is
// what the event_dishes_write RLS policy checks - claimed_by = auth.uid()
// OR the caller owns the event (so a host can also add placeholder dishes
// for guests to claim later, e.g. with guest_name set instead).

const CATEGORY_VALUES = ["starter", "main", "dessert", "drinks", "other"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipeId = typeof body.recipe_id === "string" ? body.recipe_id : null;
  const freeText = typeof body.free_text === "string" ? body.free_text.trim() : "";
  if (!recipeId && !freeText) {
    return NextResponse.json(
      { error: "Pick a recipe or describe a dish." },
      { status: 400 }
    );
  }

  const category = CATEGORY_VALUES.includes(body.category) ? body.category : "other";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: dish, error } = await supabase
    .from("event_dishes")
    .insert({
      event_id: eventId,
      claimed_by: user.id,
      recipe_id: recipeId,
      free_text: recipeId ? null : freeText,
      category,
      claimed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !dish) {
    return NextResponse.json(
      { error: "Couldn't claim that dish. Try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, dishId: dish.id });
}
