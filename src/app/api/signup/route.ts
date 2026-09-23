export const runtime = "edge";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";
const ADMIN_EMAIL = "adrienpierson8@gmail.com";

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!9";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { first_name, last_name, email } = body;
  if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const name = `${first_name.trim()} ${last_name.trim()}`;
  const emailLC = email.trim().toLowerCase();
  const tempPass = randomPassword();

  // 1. Create or find user, set a temp password
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: emailLC,
    password: tempPass,
    email_confirm: true,
    user_metadata: { full_name: name, first_name: first_name.trim(), last_name: last_name.trim() },
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      // Existing user — reset their password so we can sign them in
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = users.find(u => u.email?.toLowerCase() === emailLC);
      if (!found) return NextResponse.json({ error: "Account issue — contact Adrien." }, { status: 500 });
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password: tempPass });
    } else {
      return NextResponse.json({ error: `Couldn't create account: ${createErr.message}` }, { status: 400 });
    }
  } else {
    userId = created.user.id;
  }

  // 2. Sign in directly — SSR client sets session cookies on the response
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: emailLC, password: tempPass });
  if (signInErr) {
    return NextResponse.json({ error: `Sign-in failed: ${signInErr.message}` }, { status: 500 });
  }

  // 3. Save to users table + join household
  await admin.from("users").upsert({ id: userId, name, email: emailLC }, { onConflict: "id" });
  const { data: membership } = await admin.from("family_members").select("family_id").eq("user_id", DEFAULT_ADMIN_ID).maybeSingle();
  if (membership?.family_id) {
    await admin.from("family_members").upsert({ family_id: membership.family_id, user_id: userId }, { onConflict: "family_id,user_id" });
  }

  // 4. Notify Adrien
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Memory Kitchen <onboarding@resend.dev>", to: [ADMIN_EMAIL], subject: `🍑 New member: ${name}`, html: `<p><strong>${name}</strong> (${emailLC}) just joined Memory Kitchen!</p>` }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
