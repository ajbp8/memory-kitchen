// Small date helpers shared by the home "Your Menu" page and the
// /api/menu/dishes route. Weeks always start Monday, matching the
// mockup's Mon-Sun day strip. The 4-week rolling window + Friday
// midnight SGT auto-roll described in the data model brief is a Vercel
// Cron job for a later session — this only needs "what week/day is it
// right now", which is all the UI renders today.

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
