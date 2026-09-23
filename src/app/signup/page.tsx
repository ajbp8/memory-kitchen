"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [step, setStep] = useState<"form" | "code">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
    });

    if (res.ok) {
      setStatus("idle");
      setStep("code");
      return;
    }

    let message = "Something went wrong. Please try again.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* ignore */ }
    setErrorMsg(message);
    setStatus("error");
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMsg("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setErrorMsg(
        error.message.includes("expired") || error.message.includes("invalid")
          ? "That code is incorrect or has expired. Check your email or request a new one."
          : "Something went wrong. Please try again."
      );
      setStatus("error");
      return;
    }

    // Server-side: save name + join household (admin client bypasses RLS)
    if (data.user) {
      await fetch("/api/auto-join-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${firstName} ${lastName}`.trim() }),
      });
    }

    window.location.assign("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--mk-cream)]">
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-bold text-center mb-1"
          style={{ color: "#065130" }}
        >
          Join Memory Kitchen
        </h1>
        <p className="text-center text-xs italic text-neutral-400 mb-8">
          &ldquo;Une cuisine sans saveur est comme une vie sans amour&rdquo;
        </p>

        {step === "form" ? (
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <input
              type="text"
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
            />
            <input
              type="text"
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-[var(--mk-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mk-gold)]"
            />
            <input
              type="email"
              required
              placeholder="Email address"
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
              {status === "working" ? "Sending code…" : "Create account"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <p className="text-center text-sm text-neutral-700 mb-2">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
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
              {status === "working" ? "Verifying…" : "Verify & join"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setErrorMsg("");
                setStatus("idle");
              }}
              className="w-full text-center text-xs text-neutral-400 underline"
            >
              Go back
            </button>
          </form>
        )}

        <p className="text-center text-xs text-neutral-400 mt-8">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
