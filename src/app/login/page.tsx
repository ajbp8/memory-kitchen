"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("idle");
      setStep("code");
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

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setErrorMsg(
        error.message.includes("expired") || error.message.includes("invalid")
          ? "That code is incorrect or has expired. Double-check it or request a new one."
          : "Something went wrong."
      );
      setStatus("error");
      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--mk-cream)]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/icons/icon-192.png"
            alt="Memory Kitchen"
            width={80}
            height={80}
            className="rounded-2xl"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "#1B5E2E" }}>
          Memory Kitchen
        </h1>

        {/* Tagline */}
        <p className="text-center text-xs text-neutral-500 mb-8 italic">
          &ldquo;Une cuisine sans saveur est comme une vie sans amour&rdquo;
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
            />
            <button
              type="submit"
              disabled={status === "working"}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#D4A017" }}
            >
              {status === "working" ? "Sending…" : "Send sign-in code"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <p className="text-center text-sm text-neutral-700 mb-2">
              Check <strong>{email}</strong> for a 6-digit code.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-[var(--mk-gold)]"
            />
            <button
              type="submit"
              disabled={status === "working"}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#D4A017" }}
            >
              {status === "working" ? "Verifying…" : "Verify code"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setErrorMsg(""); setStatus("idle"); }}
              className="w-full text-center text-xs text-neutral-400 underline"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-xs text-neutral-400 mt-8">
          New here?{" "}
          <Link href="/signup" className="underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
