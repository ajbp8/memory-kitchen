"use client";
import { useState } from "react";

export default function InviteLink() {
  const [status, setStatus] = useState<"idle" | "working" | "copied" | "error">("idle");
  const [remaining, setRemaining] = useState<number | null>(null);

  async function handleClick() {
    setStatus("working");
    const res = await fetch("/api/invites", { method: "POST" });
    if (!res.ok) { setStatus("error"); return; }
    const { token, invitesRemaining } = await res.json();
    const link = `${window.location.origin}/join?token=${token}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    setRemaining(invitesRemaining);
    setStatus("copied");
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--mk-border)", background: "white" }}>
      <p className="text-sm font-bold mb-1" style={{ color: "#1B5E2E" }}>
        Invite someone
      </p>
      <p className="text-xs text-neutral-500 mb-3">
        Share Memory Kitchen with family & friends!
        {remaining !== null && ` ${remaining} use${remaining === 1 ? "" : "s"} remaining.`}
      </p>
      <button
        onClick={handleClick}
        disabled={status === "working"}
        className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: status === "copied" ? "#1B5E2E" : "#D4A017" }}
      >
        {status === "working" ? "Generating…"
          : status === "copied" ? "✓ Link copied!"
          : "Copy invite link"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-500 mt-2 text-center">Couldn't create a link. Try again.</p>
      )}
    </div>
  );
}
