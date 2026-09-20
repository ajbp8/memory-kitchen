"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Originally added to catch the magic-link callback (session arriving via
// URL hash) and force a full reload so the server middleware would see the
// new cookie. Login has since moved to a typed 6-digit code (see
// src/app/login/page.tsx), which already does that same full reload itself
// right after a successful verifyOtp call.
//
// That left this listener redundant — and actively harmful. Supabase's
// browser client re-fires "SIGNED_IN" not just for a brand-new sign-in, but
// also whenever it restores an already-valid session from storage on page
// load. Because this component is mounted globally in the root layout, that
// meant EVERY navigation (e.g. clicking "Profile" in the bottom nav) hit
// this handler and immediately hard-redirected back to "/" before the
// requested page ever got a chance to render. Instantiating the client is
// still useful (keeps token refresh / multi-tab sync working); it just
// intentionally no longer redirects on auth events.
export default function AuthSessionListener() {
  useEffect(() => {
    const supabase = createClient();
    void supabase;
  }, []);

  return null;
}
