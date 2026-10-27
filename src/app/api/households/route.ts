import { createClient } from "@/lib/supabase/server";
import { notifyOwner } from "@/lib/notify";
import { NextResponse } from "next/server";

// Creates a new family and makes the current user its single admin.
// All the rules (one family per user, one admin per family) live in the
// create_family() database function, so they hold no matter who calls it.
export async function POST(request: Request) {
  const { name } = await request.json().catch(() => ({}));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Family name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: familyId, error } = await supabase.rpc("create_family", {
    family_name: name.trim(),
  });

  if (error || !familyId) {
    const message = error?.message?.includes("already belong")
      ? "You already belong to a family."
      : "Couldn't create your family. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await notifyOwner(`New family: ${name.trim()}`, [
    `Family: ${name.trim()}`,
    `Admin: ${user.email}`,
    `Time: ${new Date().toISOString()}`,
  ]);

  return NextResponse.json({ ok: true, familyId });
}
