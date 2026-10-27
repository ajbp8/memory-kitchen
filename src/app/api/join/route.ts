import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOwner } from "@/lib/notify";
import { NextResponse } from "next/server";

// Open signup: anyone who has the app URL can create an account. The server
// route stays the single place accounts are created (Supabase public signups
// remain disabled), which lets us attach the new user to a family when they
// arrive through a family invite link (?family=<token>).
//
// - No family token: the user signs in, sees "Create your family" and becomes
//   that family's one admin (see /api/households).
// - With a family token: the user is added to that family as a plain member.
//   The unique indexes in migration 0005 make "two admins" or "two families"
//   impossible even if this code were wrong.
export async function POST(request: Request) {
  const { email, familyToken } = await request.json().catch(() => ({}));

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate the family link BEFORE creating the account.
  let family: { family_id: string; name: string } | null = null;
  if (familyToken) {
    const { data: invite } = await admin
      .from("family_invites")
      .select("family_id, families(name)")
      .eq("token", familyToken)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "That family invite link is no longer valid." }, { status: 400 });
    }
    const fam = invite.families as unknown as { name: string } | null;
    family = { family_id: invite.family_id, name: fam?.name ?? "a family" };
  }

  const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(email);

  if (createError || !created?.user) {
    const alreadyExists = /already|registered|exists/i.test(createError?.message ?? "");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "That email already has an account. Sign in instead."
          : "Couldn't create your account. Try again.",
      },
      { status: 400 }
    );
  }

  const userId = created.user.id;
  await admin.from("users").insert({ id: userId, email });

  if (family) {
    const { error: memberError } = await admin
      .from("family_members")
      .insert({ family_id: family.family_id, user_id: userId, role: "member" });

    if (memberError) {
      return NextResponse.json(
        { error: "Account created, but we couldn't add you to the family. Ask the family admin for a new link." },
        { status: 400 }
      );
    }
  }

  await notifyOwner(`New user: ${email}`, [
    `Email: ${email}`,
    family ? `Joined family: ${family.name} (as member)` : "Signed up directly (will create their own family)",
    `Time: ${new Date().toISOString()}`,
  ]);

  return NextResponse.json({ ok: true, familyName: family?.name ?? null });
}
