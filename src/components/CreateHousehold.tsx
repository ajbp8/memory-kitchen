"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Shown on the Profile screen when the signed-in user isn't a member of any
// household yet. Every other feature (recipes shared with "your family",
// the weekly menu) is scoped to a family_id, so this is the one thing every
// new user needs before anything else on the roadmap makes sense.
export default function CreateHousehold() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      router.refresh();
      return;
    }

    let message = "Something went wrong.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error response — fall back to generic message.
    }
    setErrorMsg(message);
    setStatus("error");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 mb-6"
      style={{ borderColor: "var(--mk-border)", background: "white" }}
    >
      <p className="text-sm font-bold mb-1" style={{ color: "#1a1a1a" }}>
        Name your household
      </p>
      <p className="text-xs text-neutral-500 mb-3">
        This is the group you&apos;ll plan menus and share recipes with.
      </p>
      <input
        type="text"
        required
        placeholder="e.g. The Pierson Family"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-2"
        style={{ borderColor: "var(--mk-border)" }}
      />
      <button
        type="submit"
        disabled={status === "working"}
        className="w-full rounded-lg py-2 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(to right, #c8602a, #e8854a)" }}
      >
        {status === "working" ? "Creating..." : "Create household"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-600 mt-2 text-center">{errorMsg}</p>
      )}
    </form>
  );
}
