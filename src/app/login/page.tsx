"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrorMsg(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    window.location.href = '/'; // session cookies set by API
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--mk-cream)]">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-4">
          <Image src="/icons/icon-192.png" alt="Memory Kitchen" width={80} height={80} className="rounded-2xl" priority />
        </div>

        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#065130" }}>
          Sign in
        </h1>
        <p className="text-center text-xs italic text-neutral-400 mb-8">
          &ldquo;Une cuisine sans saveur est comme une vie sans amour&rdquo;
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" required placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
          />
          <button
            type="submit" disabled={status === "working"}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#065130" }}
          >
            {status === "working" ? "Signing in…" : "Sign in →"}
          </button>
          {status === "error" && (
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(6,81,48,0.06)", border: "1px solid rgba(6,81,48,0.15)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#065130" }}>
                {errorMsg.includes("No account") ? "No account for that email" : "Sign-in failed"}
              </p>
              {errorMsg.includes("No account") ? (
                <>
                  <p className="text-xs text-neutral-500 mb-3">You need an invite to join Memory Kitchen.</p>
                  <a href="/signup" className="block w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: "#065130" }}>
                    Create my account →
                  </a>
                </>
              ) : (
                <p className="text-xs text-neutral-500">{errorMsg}</p>
              )}
            </div>
          )}
        </form>

        <p className="text-center text-xs text-neutral-400 mt-8">
          New here?{" "}
          <Link href="/signup" className="underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
