"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function JoinForm() {
  const searchParams = useSearchParams();
  const tokenFromLink = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromLink);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });

    if (res.ok) {
      setStatus("sent");
      return;
    }

    let message = "Something went wrong.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error response (e.g. unexpected redirect/405) — fall back to generic message.
    }
    setErrorMsg(message);
    setStatus("error");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--mk-cream)]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "var(--mk-terracotta)" }}>
          Join Memory Kitchen
        </h1>
        <p className="text-center text-sm text-neutral-500 mb-8">
          Enter the invite code a family member sent you
        </p>

        {status === "sent" ? (
          <p className="text-center text-sm text-neutral-700">
            Check <strong>{email}</strong> for a link to finish setting up your account.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-terracotta)]"
            />
            <input
              type="text"
              required
              placeholder="Invite code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-terracotta)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(to right, #c8602a, #e8854a)" }}
            >
              {status === "sending" ? "Joining..." : "Join"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}
