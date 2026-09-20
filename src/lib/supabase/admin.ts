import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Uses the service role key — NEVER import this from a
// Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Used to: (1) create auth users only after an invite token is validated,
// bypassing the disabled public-signup setting; (2) admin-only writes.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
