import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Magic-link sign-in for EXISTING users only. shouldCreateUser:false
// means this can never be used to create a new account — that only
// happens through /api/join after a valid invite token is checked.
export async function POST(request: Request) {
    const { email } = await request.json();
    if (!email) {
          return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

  const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
    });

  if (error) {
        // Rate limit hit — Supabase caps at 2 OTP emails/hour on free tier
      if (
              error.status === 429 ||
              error.message?.toLowerCase().includes("rate limit") ||
              error.message?.toLowerCase().includes("email rate")
            ) {
              return NextResponse.json(
                { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
                { status: 429 }
                      );
      }
        return NextResponse.json(
          { error: "We couldn't find an account for that email. You'll need an invite to join." },
          { status: 400 }
              );
  }

  return NextResponse.json({ ok: true });
}
