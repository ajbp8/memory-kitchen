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
    return NextResponse.json(
      { error: "We couldn't find an account for that email. You'll need an invite to join." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
