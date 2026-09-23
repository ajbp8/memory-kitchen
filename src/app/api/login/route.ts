import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const admin = createAdminClient();

  // Check user exists
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = users.find(u => u.email?.toLowerCase() === email);
  if (!found) return NextResponse.json({ error: "No account found for that email. Check your invite link." }, { status: 400 });

  // Generate instant magic link — no email sent
  const origin = new URL(request.url).origin;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: "Couldn't generate login link." }, { status: 500 });
  }

  return NextResponse.json({ action_link: linkData.properties.action_link });
}
