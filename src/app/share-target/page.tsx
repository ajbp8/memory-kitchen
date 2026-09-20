"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ShareTargetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Web Share Target sends the shared URL/text/title as query params
    const url = searchParams.get("url") ?? searchParams.get("text") ?? "";
    const title = searchParams.get("title") ?? "";
    const params = new URLSearchParams();
    if (url) params.set("url", url);
    if (title) params.set("name", title);
    // Redirect to the recipe creation page with the shared data pre-filled
    router.replace(`/recipes/new?${params.toString()}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "var(--mk-cream)" }}>
      <div className="text-3xl animate-pulse">✦</div>
      <p className="text-sm font-medium text-neutral-500">Opening in Memory Kitchen…</p>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--mk-cream)" }}>
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    }>
      <ShareTargetInner />
    </Suspense>
  );
}
