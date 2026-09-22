import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EditRecipeForm from "@/components/EditRecipeForm";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, name, story, source_url, ingredients, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  // Only the owner can edit
  if (recipe.owner_id !== user.id) redirect(`/recipes/${id}`);

  return (
    <div className="min-h-screen" style={{ background: "var(--mk-cream)" }}>

      {/* Header */}
      <div
        style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-6"
      >
        <Link
          href={`/recipes/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium mb-4"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          ← Cancel
        </Link>
        <h1 className="text-xl font-bold text-white">Edit recipe</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          {recipe.name}
        </p>
      </div>

      <div className="px-5 pt-5 pb-24">
        <EditRecipeForm recipe={recipe} />
      </div>
    </div>
  );
}
