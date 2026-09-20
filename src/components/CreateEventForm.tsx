"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Sits at the top of /events, mirroring CreateHousehold's collapsed-link ->
// inline-form -> fetch -> router.refresh() pattern. Kept deliberately small:
// just name + optional date + optional description, matching what
// POST /api/events accepts. Guests/dish-claiming happen after creation, on
// the event card itself (ClaimDishForm), not in this form.
export default function CreateEventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        event_date: eventDate || null,
        description: description.trim() || null,
      }),
    });

    if (res.ok) {
      setName("");
      setEventDate("");
      setDescription("");
      setOpen(false);
      setStatus("idle");
      router.refresh();
      return;
    }

    let message = "Couldn't create that event.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error response - fall back to generic message.
    }
    setErrorMsg(message);
    setStatus("error");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl py-2.5 text-xs font-semibold text-white mb-3.5"
        style={{ background: "linear-gradient(to right, #c8602a, #e8854a)" }}
      >
        + New event
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-3 mb-3.5 border space-y-2"
      style={{ borderColor: "var(--mk-border)" }}
    >
      <input
        type="text"
        placeholder="Event name (e.g. Christmas Lunch)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
        style={{ borderColor: "var(--mk-border)" }}
      />
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
        style={{ borderColor: "var(--mk-border)" }}
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
        style={{ borderColor: "var(--mk-border)" }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "working"}
          className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(to right, #c8602a, #e8854a)" }}
        >
          {status === "working" ? "Creating..." : "Create event"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setErrorMsg("");
            setStatus("idle");
          }}
          className="px-3 rounded-lg py-1.5 text-xs font-semibold"
          style={{ background: "#f7f4ef", color: "#888" }}
        >
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
    </form>
  );
}
