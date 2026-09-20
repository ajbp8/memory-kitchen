"use client";

import { useState } from "react";

export default function SaveButton({
  recipeId,
  initiallySaved,
}: {
  recipeId: string;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [working, setWorking] = useState(false);

  async function toggle() {
    setWorking(true);
    const res = await fetch(`/api/recipes/${recipeId}/save`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSaved(Boolean(data.saved));
    }
    setWorking(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={working}
      aria-label={saved ? "Unsave recipe" : "Save recipe"}
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-50"
      style={{
        background: saved ? "#D4A017" : "rgba(255,255,255,0.2)",
        border: "1.5px solid rgba(255,255,255,0.4)",
      }}
    >
      {saved ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )}
    </button>
  );
}
