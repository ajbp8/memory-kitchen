import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

// The family admin's invite link. One reusable link per family; the admin can
// reset it (POST { reset: true }) if it ever leaks. Only admins can read or
// change it (RLS on family_invites uses is_family_admin).
export async function POST(request: Request) {
  const { reset } = await request.json().catch(() => ({}));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only the family admin can invite people." }, { status: 403 });
  }

  if (reset) {
    const { data, error } = await supabase
      .from("family_invites")
      .update({ token: randomBytes(16).toString("hex") })
      .eq("family_id", membership.family_id)
      .select("token")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Couldn't reset the link." }, { status: 400 });
    }
    return NextResponse.json({ token: data.token });
  }

  const { data: existing } = await supabase
    .from("family_invites")
    .select("token")
    .eq("family_id", membership.family_id)
    .maybeSingle();

  if (existing) return NextResponse.json({ token: existing.token });

  const { data: created, error } = await supabase
    .from("family_invites")
    .insert({ family_id: membership.family_id })
    .select("token")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Couldn't create an invite link." }, { status: 400 });
  }
  return NextResponse.json({ token: created.token });
}
