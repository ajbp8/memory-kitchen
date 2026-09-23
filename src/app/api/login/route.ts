export const runtime = "edge";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!9";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const admin = createAdminClient();

  // Find user
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = users.find(u => u.email?.toLowerCase() === email);
  if (!found) return NextResponse.json({ error: "No account found for that email. Ask Adrien for an invite link." }, { status: 400 });

  // Reset password + sign in directly
  const tempPass = randomPassword();
  await admin.auth.admin.updateUserById(found.id, { password: tempPass });

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: tempPass });
  if (signInErr) return NextResponse.json({ error: `Sign-in failed: ${signInErr.message}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
