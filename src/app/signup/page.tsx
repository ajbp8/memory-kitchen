"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [status,    setStatus]    = useState<"idle" | "working" | "error">("idle");
  const [errorMsg,  setErrorMsg]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    // Redirect to Supabase magic link — logs user in instantly, no email needed
    window.location.assign(data.action_link);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--mk-cream)]">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-4">
          <Image src="/icons/icon-192.png" alt="Memory Kitchen" width={80} height={80} className="rounded-2xl" priority />
        </div>

        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#065130" }}>
          Join Memory Kitchen
        </h1>
        <p className="text-center text-xs italic text-neutral-400 mb-8">
          &ldquo;Une cuisine sans saveur est comme une vie sans amour&rdquo;
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text" required placeholder="First name"
            value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
          />
          <input
            type="text" required placeholder="Last name"
            value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
          />
          <input
            type="email" required placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
          />
          <button
            type="submit" disabled={status === "working"}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#065130" }}
          >
            {status === "working" ? "Creating your account…" : "Join Memory Kitchen →"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600 text-center">{errorMsg}</p>
          )}
        </form>

        <p className="text-center text-xs text-neutral-400 mt-8">
          Already have an account?{" "}
          <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
