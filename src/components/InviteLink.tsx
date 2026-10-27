"use client";
import { useState } from "react";

// Family admin only. Copies this family's invite link; "Reset link" kills the
// old one if it ever ends up with the wrong person.
export default function InviteLink() {
  const [status, setStatus] = useState<"idle" | "working" | "copied" | "error">("idle");

  async function request(reset: boolean) {
    setStatus("working");
    const res = await fetch("/api/family-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset }),
    });
    if (!res.ok) { setStatus("error"); return; }
    const { token } = await res.json();
    const link = `${window.location.origin}/join?family=${token}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    setStatus("copied");
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--mk-border)", background: "white" }}>
      <p className="text-sm font-bold mb-1" style={{ color: "#1B5E2E" }}>
        Invite your family
      </p>
      <p className="text-xs text-neutral-500 mb-3">
        Anyone who opens this link joins your family and shares your menus.
      </p>
      <button
        onClick={() => request(false)}
        disabled={status === "working"}
        className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: status === "copied" ? "#1B5E2E" : "#D4A017" }}
      >
        {status === "working" ? "Generating…"
          : status === "copied" ? "✓ Link copied!"
          : "Copy family invite link"}
      </button>
      <button
        onClick={() => request(true)}
        disabled={status === "working"}
        className="w-full text-center text-xs text-neutral-400 underline mt-2"
      >
        Reset link (old one stops working)
      </button>
      {status === "error" && (
        <p className="text-xs text-red-500 mt-2 text-center">Couldn't create a link. Try again.</p>
      )}
    </div>
  );
}
