"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-4 w-full rounded-lg border py-2 text-sm font-semibold"
      style={{ borderColor: "var(--mk-border)", color: "#9a948a" }}
    >
      Log out
    </button>
  );
}
