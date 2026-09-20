import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Invite-only signup. Validates the invite token against public.invites
// (service role bypasses RLS here, deliberately — this is the one place
// new accounts are allowed to be created) before calling
// admin.inviteUserByEmail, which creates the auth user and emails them
// a secure sign-in link. Public signups stay disabled in Supabase Auth
// settings, so this server route is the ONLY path to a new account.
//
// Session 6: also creates an accepted friendship between inviter and
// invitee right here. This is the only point in the app where two users
// are guaranteed to have a real-world relationship (one invited the
// other), so it's the natural place to seed the social graph — there's
// no separate "send/accept friend request" flow in this build.
export async function POST(request: Request) {
  const { email, token } = await request.json();

  if (!email || !token) {
    return NextResponse.json({ error: "Email and invite code are required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, invited_by, status, invites_remaining")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "That invite link is invalid." }, { status: 400 });
  }
  if (invite.status === "expired" || invite.invites_remaining <= 0) {
    return NextResponse.json({ error: "That invite link has expired." }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(email);

  if (createError) {
    return NextResponse.json(
      { error: createError.message ?? "Couldn't create your account. Try again." },
      { status: 400 }
    );
  }

  if (created?.user) {
    await admin.from("users").insert({
      id: created.user.id,
      email,
      invited_by: invite.invited_by,
    });

    await admin.from("friendships").insert({
      user_id: invite.invited_by,
      friend_id: created.user.id,
      status: "accepted",
    });

    await admin
      .from("invites")
      .update({
        invites_remaining: Math.max(invite.invites_remaining - 1, 0),
        status: invite.invites_remaining - 1 <= 0 ? "accepted" : "pending",
      })
      .eq("id", invite.id);
  }

  return NextResponse.json({ ok: true });
}
