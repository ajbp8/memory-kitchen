import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RecipeListClient from "@/components/RecipeListClient";

export const runtime = "edge";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, cuisine_tags, save_count, owner_id")
    .order("created_at", { ascending: false })
    .limit(150);

  return <RecipeListClient userId={user.id} initialRecipes={recipes ?? []} />;
}
