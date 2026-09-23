import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "edge";

const DEFAULT_ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";

export async function POST(req: Request) {
  // Accept optional name from signup
  const body = await req.json().catch(() => ({}));
  const name: string | undefined = body.name;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 1. Upsert into public.users (admin bypasses RLS — always succeeds)
  // Always upsert with email (NOT NULL in users table)
  await admin.from("users").upsert(
    { id: user.id, name: name ?? user.email ?? "", email: user.email ?? "" },
    { onConflict: "id" }
  );

  // 2. Find default family and add user
  const { data: membership } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", DEFAULT_ADMIN_ID)
    .maybeSingle();

  if (membership?.family_id) {
    await admin
      .from("family_members")
      .upsert(
        { family_id: membership.family_id, user_id: user.id },
        { onConflict: "family_id,user_id" }
      );
  }

  return NextResponse.json({ ok: true });
}
