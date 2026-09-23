import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "edge";

const DEFAULT_ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";
const ADMIN_EMAIL    = "adrienpierson8@gmail.com";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { first_name, last_name, email } = body;
  if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  const admin  = createAdminClient();
  const name   = `${first_name.trim()} ${last_name.trim()}`;
  const emailLC = email.trim().toLowerCase();

  // 1. Create user with email already confirmed (no verification email sent)
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: emailLC,
    email_confirm: true,
    user_metadata: { full_name: name, first_name: first_name.trim(), last_name: last_name.trim() },
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      // Already registered — find their ID and still log them in
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = users.find(u => u.email?.toLowerCase() === emailLC);
      if (!found) return NextResponse.json({ error: "Account issue — contact Adrien." }, { status: 500 });
      userId = found.id;
    } else {
      return NextResponse.json({ error: `Couldn't create account: ${createErr.message}` }, { status: 400 });
    }
  } else {
    userId = created.user.id;
  }

  // 2. Generate a one-time magic link → instant login, no email needed
  const origin = new URL(request.url).origin;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: emailLC,
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: "Couldn't generate login link." }, { status: 500 });
  }

  // 3. Save to users table
  await admin.from("users").upsert(
    { id: userId, name, email: emailLC },
    { onConflict: "id" }
  );

  // 4. Join default household
  const { data: membership } = await admin
    .from("family_members").select("family_id")
    .eq("user_id", DEFAULT_ADMIN_ID).maybeSingle();
  if (membership?.family_id) {
    await admin.from("family_members").upsert(
      { family_id: membership.family_id, user_id: userId },
      { onConflict: "family_id,user_id" }
    );
  }

  // 5. Notify Adrien (non-blocking, uses Resend API directly)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Memory Kitchen <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🍑 New member: ${name}`,
        html: `<p><strong>${name}</strong> (<a href="mailto:${emailLC}">${emailLC}</a>) just joined Memory Kitchen!</p>`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ action_link: linkData.properties.action_link });
}
