import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import LogoutButton from "@/components/LogoutButton";
import EditProfileForm from "@/components/EditProfileForm";

export const runtime = "edge";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, recipesResult, membersResult] = await Promise.all([
    supabase.from("users").select("name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("users").select("id, name, avatar_url").order("name"),
  ]);

  const displayName = profileResult.data?.name || user.email?.split("@")[0] || "there";
  const avatarUrl = profileResult.data?.avatar_url ?? null;
  const recipeCount = recipesResult.count ?? 0;
  const members = membersResult.data ?? [];

  // Fetch recipe counts for all members in one query
  const memberIds = members.map(m => m.id);
  const { data: allRecipes } = memberIds.length > 0
    ? await supabase.from("recipes").select("owner_id").in("owner_id", memberIds)
    : { data: [] };

  const recipeCounts: Record<string, number> = {};
  for (const r of allRecipes ?? []) {
    recipeCounts[r.owner_id] = (recipeCounts[r.owner_id] || 0) + 1;
  }

  // Sort: current user first, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === user.id) return -1;
    if (b.id === user.id) return 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
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

        {/* Family Members */}
        {sortedMembers.length > 0 && (
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--mk-border)", background: "white" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#D4A017" }}>
              The Family 👪
            </p>
            <div className="space-y-3">
              {sortedMembers.map(member => {
                const initials = (member.name || "?").slice(0, 2).toUpperCase();
                const count = recipeCounts[member.id] ?? 0;
                const isMe = member.id === user.id;
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                      style={{ border: "2px solid var(--mk-border)" }}>
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatar_url} alt={member.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: isMe ? "#065130" : "#c8802a" }}>
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>
                        {member.name || "Unnamed"}{isMe ? " (you)" : ""}
                      </p>
                      <p className="text-[10px]" style={{ color: "#888" }}>
                        {count} {count === 1 ? "recipe" : "recipes"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <InviteLink />
        <LogoutButton />
      </div>
    </main>
  );
}
