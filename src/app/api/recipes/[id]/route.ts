export const runtime = "edge";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_ID = "c3342872-a9e3-4097-a75d-b67aefa8dead";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Only allow updating safe, known columns — never owner_id or id
  const ALLOWED = [
    "name",
    "story",
    "source_url",
    "ingredients",
    "cuisine_tags",
    "dietary_tags",
    "visibility",
  ] as const;

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const isAdmin = user.id === ADMIN_ID;
  let updateQuery = supabase.from("recipes").update(update).eq("id", id);
  if (!isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
  const { error } = await updateQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.id === ADMIN_ID;
  let deleteQuery = supabase.from("recipes").delete().eq("id", id);
  if (!isAdmin) deleteQuery = deleteQuery.eq("owner_id", user.id);
  const { error } = await deleteQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
