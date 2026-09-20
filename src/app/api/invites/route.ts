import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Returns the current user's reusable invite link, creating one the first
// time they ask. invites_remaining defaults to 5 uses per row — this app
// gives each user a single standing invite link rather than minting a new
// token per friend, matching the "X invites remaining" stat on the Profile
// screen design. Uses the regular (RLS-scoped) server client, not the admin
// client — invites_select_own / invites_insert_own already allow a user to
// read and create their own invite rows, so there's no reason to bypass RLS
// here the way /api/join deliberately does for account creation.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("invites")
    .select("token, invites_remaining")
    .eq("invited_by", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      token: existing.token,
      invitesRemaining: existing.invites_remaining,
    });
  }

  const { data: created, error } = await supabase
    .from("invites")
    .insert({ invited_by: user.id })
    .select("token, invites_remaining")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: "Couldn't create an invite link. Try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    token: created.token,
    invitesRemaining: created.invites_remaining,
  });
}
