// Small date helpers shared by the home "Your Menu" page and the
// /api/menu/dishes route. Weeks always start Monday, matching the
// mockup's Mon-Sun day strip. The 4-week rolling window + Friday
// midnight SGT auto-roll described in the data model brief is a Vercel
// Cron job for a later session — this only needs "what week/day is it
// right now", which is all the UI renders today.

// The app's home timezone. Memory Kitchen is a single-household planner and
// the whole data model (week rollovers, "today") is designed around SGT, per
// the data model brief -- see the Friday-midnight-SGT note below.
const APP_TIMEZONE = "Asia/Singapore";

// "Today" as YYYY-MM-DD in the app's home timezone, not the server's wall
// clock. Server components/route handlers run on Vercel in UTC, so a naive
// `new Date()` there can land on the previous calendar day while it's
// already tomorrow in Singapore (any time before 8am SGT is still
// "yesterday" in UTC). Left uncorrected, that skews which week is "this
// week" for the server-rendered initial menu -- off by a whole week right
// at a Monday boundary -- while the browser (running in the user's own,
// correct timezone) computes the right week. Always use this instead of a
// raw `new Date()` when the server needs "today".
export function todayStrInAppTZ(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function mondayOf(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export const MEAL_LABELS: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
};
