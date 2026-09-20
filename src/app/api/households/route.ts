import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Creates a new household (family) and makes the current user its admin.
// Every other feature on the roadmap (recipes shared with "your family",
// weekly menu planning) is scoped to a family_id, so a brand-new user needs
// one of these before anything else makes sense. There's no "join an
// existing household" flow yet — that's a reasonable follow-up once
// invites become family-aware rather than just network-wide.
export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Household name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: name.trim(), created_by: user.id })
    .select("id")
    .single();

  if (familyError || !family) {
    return NextResponse.json(
      { error: "Couldn't create household. Try again." },
      { status: 400 }
    );
  }

  const { error: memberError } = await supabase
    .from("family_members")
    .insert({ family_id: family.id, user_id: user.id, role: "admin" });

  if (memberError) {
    return NextResponse.json(
      { error: "Household created, but couldn't add you as a member." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, familyId: family.id });
}
