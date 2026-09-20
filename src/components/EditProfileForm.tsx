"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditProfileForm({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.slice(0, 2).toUpperCase();

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("users")
        .update({ name: name.trim() })
        .eq("id", userId);
      if (err) throw err;
      setEditing(false);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Avatar placeholder */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3 border-2"
        style={{ background: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" }}
      >
        {initials}
      </div>

      {/* Name */}
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()}
          className="text-center text-lg font-bold rounded-xl px-3 py-1.5 mb-1 outline-none"
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            minWidth: "160px",
          }}
          autoFocus
        />
      ) : (
        <h1 className="text-lg font-bold text-white mb-1">{name}</h1>
      )}

      {error && <p className="text-xs text-red-300 mb-1">{error}</p>}

      {editing ? (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => { setEditing(false); setName(initialName); setError(null); }}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >Cancel</button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="text-xs px-4 py-1.5 rounded-full font-bold disabled:opacity-50"
            style={{ background: "#D4A017", color: "white" }}
          >{saving ? "Saving…" : "Save"}</button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1 rounded-full font-semibold mt-1"
          style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
        >Edit name</button>
      )}
    </div>
  );
}
