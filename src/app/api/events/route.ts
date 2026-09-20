import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Session 5: events are owned by a single user (not a household), per the
// events table - owner_id, optional event_date/description, and a
// visibility flag ('network' | 'link-only') enforced by the
// events_select_visible RLS policy. POST here just creates the event row;
// the /events page (and events_select_visible) handle who can see it, the
// same separation of concerns used by recipes' visibility column.

const VISIBILITY_VALUES = ["network", "link-only"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Event name is required." }, { status: 400 });
  }

  const visibility = VISIBILITY_VALUES.includes(body.visibility)
    ? body.visibility
    : "network";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name,
      event_date: typeof body.event_date === "string" ? body.event_date || null : null,
      description:
        typeof body.description === "string" ? body.description.trim() || null : null,
      visibility,
    })
    .select("id, invite_token")
    .single();

  if (error || !event) {
    return NextResponse.json(
      { error: "Couldn't create the event. Try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    inviteToken: event.invite_token,
  });
}
