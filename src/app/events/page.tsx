import { createClient } from "@/lib/supabase/server";
import CreateEventForm from "@/components/CreateEventForm";
import ClaimDishForm from "@/components/ClaimDishForm";

type NameEmbed = { name: string } | { name: string }[] | null;

type DishRow = {
  id: string;
  free_text: string | null;
  category: string;
  claimed_by: string | null;
  recipe_id: string | null;
  recipes: NameEmbed;
  users: NameEmbed;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  description: string | null;
  owner_id: string;
  event_dishes: DishRow[];
};

const CATEGORY_ICON: Record<string, string> = {
  starter: "🥂",
  main: "🍗",
  dessert: "🎂",
  drinks: "🍺",
  other: "🍽️",
};

const EVENT_DISH_SELECT =
  "id, name, event_date, description, owner_id, event_dishes(id, free_text, category, claimed_by, recipe_id, recipes!event_dishes_recipe_id_fkey(name), users!event_dishes_claimed_by_fkey(name))";

// Session 5's /events page: the mockup's "You're hosting" / "You're invited"
// screen. Events are owned by a single user, not a family (per the events
// table), so this page queries by owner_id / event_participants membership
// rather than family_id like the home page does. Reuses the same patterns
// established there: server component does the data fetching, a small
// client form (ClaimDishForm) handles the one interactive bit, and
// Array.isArray() unwraps Supabase's ambiguous to-one embed typing.
export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware already redirects unauthenticated visitors to /login
  }

  const [recipesResult, hostingResult, participantRowsResult] = await Promise.all([
    supabase.from("recipes").select("id, name").eq("owner_id", user.id).order("name"),
    supabase
      .from("events")
      .select(EVENT_DISH_SELECT)
      .eq("owner_id", user.id)
      .order("event_date", { ascending: true }),
    supabase.from("event_participants").select("event_id").eq("user_id", user.id),
  ]);

  const myRecipes = recipesResult.data ?? [];
  const hostingEvents = (hostingResult.data ?? []) as EventRow[];

  const invitedEventIds = (participantRowsResult.data ?? []).map((r) => r.event_id);
  let invitedEvents: EventRow[] = [];
  if (invitedEventIds.length > 0) {
    const { data: invitedRows } = await supabase
      .from("events")
      .select(EVENT_DISH_SELECT)
      .in("id", invitedEventIds)
      .neq("owner_id", user.id)
      .order("event_date", { ascending: true });
    invitedEvents = (invitedRows ?? []) as EventRow[];
  }

  const allEventIds = [
    ...hostingEvents.map((e) => e.id),
    ...invitedEvents.map((e) => e.id),
  ];

  const guestCounts: Record<string, number> = {};
  if (allEventIds.length > 0) {
    const { data: allParticipants } = await supabase
      .from("event_participants")
      .select("event_id")
      .in("event_id", allEventIds);
    for (const row of allParticipants ?? []) {
      guestCounts[row.event_id] = (guestCounts[row.event_id] ?? 0) + 1;
    }
  }

  return (
    <main className="min-h-screen px-5 pt-8 pb-6 bg-[var(--mk-cream)]">
      <h1 className="text-base font-extrabold mb-4" style={{ color: "#1a1a1a" }}>
        Events
      </h1>

      <SectionTitle>You&apos;re hosting</SectionTitle>
      <CreateEventForm />
      {hostingEvents.length === 0 ? (
        <p className="text-xs text-neutral-400 mb-4">No events yet.</p>
      ) : (
        hostingEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            badge="Hosting"
            guestCount={guestCounts[event.id] ?? 0}
            userId={user.id}
            myRecipes={myRecipes}
          />
        ))
      )}

      <SectionTitle>You&apos;re invited</SectionTitle>
      {invitedEvents.length === 0 ? (
        <p className="text-xs text-neutral-400">Nothing here yet.</p>
      ) : (
        invitedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            badge="Invited"
            guestCount={guestCounts[event.id] ?? 0}
            userId={user.id}
            myRecipes={myRecipes}
          />
        ))
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold mb-2 mt-1" style={{ color: "#1a1a1a" }}>
      {children}
    </h2>
  );
}

function unwrap(embed: NameEmbed): { name: string } | null {
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function EventCard({
  event,
  badge,
  guestCount,
  userId,
  myRecipes,
}: {
  event: EventRow;
  badge: "Hosting" | "Invited";
  guestCount: number;
  userId: string;
  myRecipes: { id: string; name: string }[];
}) {
  const dateLabel = event.event_date
    ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      })
    : null;

  const claimedCount = event.event_dishes.length;

  return (
    <div
      className="bg-white rounded-xl p-3 mb-2 border"
      style={{ borderColor: badge === "Hosting" ? "var(--mk-terracotta)" : "var(--mk-border)" }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[13px] font-bold" style={{ color: "#1a1a1a" }}>
            {event.name}
          </div>
          <div className="text-[10px] font-semibold" style={{ color: "var(--mk-terracotta)" }}>
            {[dateLabel, `${guestCount} guest${guestCount === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div
          className="text-[10px] font-semibold px-2 py-1 rounded-full"
          style={{
            background: badge === "Hosting" ? "#fef5f0" : "#f7f4ef",
            color: badge === "Hosting" ? "var(--mk-terracotta)" : "#888",
          }}
        >
          {badge}
        </div>
      </div>

      {claimedCount > 0 && (
        <div className="text-[10px] text-neutral-400 mb-1.5">
          {claimedCount} dish{claimedCount === 1 ? "" : "es"} claimed
        </div>
      )}

      <div className="flex flex-col gap-1 mb-1.5">
        {event.event_dishes.map((dish) => {
          const recipe = unwrap(dish.recipes);
          const claimer = unwrap(dish.users);
          const name = recipe?.name ?? dish.free_text ?? "Untitled dish";
          const isMe = dish.claimed_by === userId;
          return (
            <div
              key={dish.id}
              className="flex items-center gap-2 py-1 px-2 rounded-md text-[10px]"
              style={{ background: "#f7f4ef" }}
            >
              <span className="text-xs">{CATEGORY_ICON[dish.category] ?? "🍽️"}</span>
              <span className="flex-1 font-medium" style={{ color: "#1a1a1a" }}>
                {name}
              </span>
              <span className="text-neutral-400">
                {isMe ? "You ✓" : claimer?.name ?? ""}
              </span>
            </div>
          );
        })}
      </div>

      <ClaimDishForm eventId={event.id} recipes={myRecipes} />
    </div>
  );
}
