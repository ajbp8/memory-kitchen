export const runtime = "edge";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all recipes that have old-style tags
  const { data: recipes, error: fetchErr } = await supabase
    .from("recipes")
    .select("id, cuisine_tags")
    .not("cuisine_tags", "is", null);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const TAG_MAP: Record<string, string | null> = {
    meat: "meat & poultry",
    poultry: "meat & poultry",
    pasta: "pasta & noodles",
    vegan: null,
    curry: null,
    baking: null,
  };

  let updated = 0;
  const errors: string[] = [];

  for (const recipe of recipes ?? []) {
    const tags: string[] = recipe.cuisine_tags ?? [];
    const needsMigration = tags.some(t => t in TAG_MAP);
    if (!needsMigration) continue;

    const newTags = [...new Set(
      tags
        .map(t => (t in TAG_MAP ? TAG_MAP[t] : t))
        .filter((t): t is string => t !== null)
    )];

    const { error } = await supabase
      .from("recipes")
      .update({ cuisine_tags: newTags })
      .eq("id", recipe.id);

    if (error) errors.push(`${recipe.id}: ${error.message}`);
    else updated++;
  }

  return NextResponse.json({ updated, errors, total: (recipes ?? []).length });
}
