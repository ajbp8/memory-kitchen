import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { first_name, last_name, email } = body;
  if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  const supabase = await createClient();

  // signInWithOtp with shouldCreateUser:true creates the account if it doesn't exist,
  // or sends a login code if it does. Works for both new and returning users at /signup.
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
      data: {
        full_name: `${first_name.trim()} ${last_name.trim()}`,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
      },
    },
  });

  if (error) {
    if (
      error.status === 429 ||
      error.message?.toLowerCase().includes("rate limit")
    ) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }
    const errDetail = JSON.stringify({ message: error.message, status: error.status, code: error.code, cause: (error as any).cause });
    console.error("[signup] Supabase OTP error:", errDetail);
    return NextResponse.json(
      { error: `Couldn't send a verification code: ${errDetail}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
