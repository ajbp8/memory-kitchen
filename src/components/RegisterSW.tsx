"use client";

import { useEffect, useState } from "react";

export default function RegisterSW() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check immediately on registration
      if (reg.waiting) setUpdateReady(true);

      // Listen for a new SW that installs while the page is open
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });

      // Poll for updates every 60 seconds (browser only checks on navigate by default)
      const interval = setInterval(() => reg.update(), 60_000);
      return () => clearInterval(interval);
    }).catch(() => {/* non-fatal */});
  }, []);

  if (!updateReady) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-3 text-white text-sm font-semibold"
      style={{ background: "#065130" }}
    >
      <span>🎉 New version available!</span>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg px-3 py-1 text-xs font-bold"
        style={{ background: "rgba(255,255,255,0.2)" }}
      >
        Update now
      </button>
    </div>
  );
}
