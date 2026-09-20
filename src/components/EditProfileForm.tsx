"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditProfileForm({
  userId,
  initialName,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialAvatarUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name.slice(0, 2).toUpperCase();

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust cache
      setAvatarUrl(data.publicUrl + "?t=" + Date.now());
    } catch {
      setError("Photo upload failed. Make sure the 'avatars' storage bucket exists in Supabase.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("users")
        .update({ name, avatar_url: avatarUrl })
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
      {/* Avatar */}
      <div className="relative mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            {initials}
          </div>
        )}
        {editing && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-white"
            style={{ background: "#D4A017", color: "white" }}
            aria-label="Change photo"
          >
            {uploading ? "…" : "📷"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
        />
      </div>

      {/* Name */}
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-center text-lg font-bold rounded-xl px-3 py-1.5 mb-1 outline-none"
          style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
          autoFocus
        />
      ) : (
        <h1 className="text-lg font-bold text-white mb-1">{name}</h1>
      )}

      {error && <p className="text-xs text-red-300 mb-1">{error}</p>}

      {/* Edit / Save buttons */}
      {editing ? (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => { setEditing(false); setName(initialName); setAvatarUrl(initialAvatarUrl); setError(null); }}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded-full font-bold disabled:opacity-50"
            style={{ background: "#D4A017", color: "white" }}
          >{saving ? "Saving…" : "Save"}</button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1 rounded-full font-semibold mt-1"
          style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
        >Edit profile</button>
      )}
    </div>
  );
}
