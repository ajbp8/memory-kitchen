import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import LogoutButton from "@/components/LogoutButton";
import EditProfileForm from "@/components/EditProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, recipesResult] = await Promise.all([
    supabase.from("users").select("name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);

  const displayName = profileResult.data?.name || user.email?.split("@")[0] || "there";
  const avatarUrl = profileResult.data?.avatar_url ?? null;
  const recipeCount = recipesResult.count ?? 0;

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)" }}
        className="px-5 pt-10 pb-8 text-center">
        <EditProfileForm
          userId={user.id}
          initialName={displayName}
          initialAvatarUrl={avatarUrl}
        />
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{recipeCount}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Recipes</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 mt-5 space-y-3">
        <InviteLink />
        <LogoutButton />
      </div>
    </main>
  );
}
