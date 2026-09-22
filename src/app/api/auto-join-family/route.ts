import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "edge";

// Adds the calling user to the default household (Adrien's family).
const DEFAULT_ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Find the default family
  const { data: membership } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", DEFAULT_ADMIN_ID)
    .maybeSingle();

  if (!membership?.family_id) {
    return NextResponse.json({ error: "No default family found" }, { status: 500 });
  }

  // Add new user — ignore if already a member
  await admin
    .from("family_members")
    .upsert(
      { family_id: membership.family_id, user_id: user.id },
      { onConflict: "family_id,user_id" }
    );

  return NextResponse.json({ ok: true });
}
