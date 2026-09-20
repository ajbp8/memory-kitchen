import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import LogoutButton from "@/components/LogoutButton";
import EditProfileForm from "@/components/EditProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, membershipResult, recipesResult] = await Promise.all([
    supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("family_members").select("families(name)").eq("user_id", user.id).limit(1),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);

  const displayName = profileResult.data?.name || user.email?.split("@")[0] || "there";

  const membershipRow = membershipResult.data?.[0] as
    | { families: { name: string } | { name: string }[] | null } | undefined;
  const familiesValue = membershipRow?.families;
  const familyName = Array.isArray(familiesValue) ? familiesValue[0]?.name : familiesValue?.name;

  const recipeCount = recipesResult.count ?? 0;

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)" }}
        className="px-5 pt-10 pb-8 text-center">
        <EditProfileForm
          userId={user.id}
          initialName={displayName}
        />
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          {familyName ?? "No household yet"}
        </p>
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
