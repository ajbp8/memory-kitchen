export const runtime = "edge";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VISIBILITY_VALUES = ["public", "friends", "private"];

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Recipe name is required." }, { status: 400 });
  }

  const visibility = VISIBILITY_VALUES.includes(body.visibility)
    ? body.visibility
    : "private";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      owner_id: user.id,
      name,
      story: typeof body.story === "string" ? body.story.trim() || null : null,
      ingredients:
        typeof body.ingredients === "string" ? body.ingredients.trim() || null : null,
      source_url:
        typeof body.source_url === "string" ? body.source_url.trim() || null : null,
      original_name: typeof body.original_name === "string" ? body.original_name.trim() || null : null,
      cuisine_tags: toStringArray(body.cuisine_tags),
      dietary_tags: toStringArray(body.dietary_tags),
      visibility,
    })
    .select("id")
    .single();

  if (error || !recipe) {
    return NextResponse.json(
      { error: "Couldn't save the recipe. Try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, recipeId: recipe.id });
}

// GET /api/recipes             → all recipes visible to user
// GET /api/recipes?mine=1      → current user's own recipes
// GET /api/recipes?q=keyword   → search across name + ingredients
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const q = searchParams.get("q")?.trim() ?? "";
  const cuisine = searchParams.get("cuisine");

  let query = supabase
    .from("recipes")
    .select(
      "id, owner_id, name, story, source_url, cuisine_tags, dietary_tags, visibility, save_count, created_at, users(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (mine) {
    query = query.eq("owner_id", user.id);
  }

  if (q) {
    const term = `%${q}%`;
    query = query.or(`name.ilike.${term},original_name.ilike.${term},ingredients.ilike.${term}`);
  }

  if (cuisine) {
    query = query.contains("cuisine_tags", [cuisine]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Couldn't load recipes." }, { status: 400 });
  }

  return NextResponse.json({ recipes: data ?? [] });
}
