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
  initialAvatarUrl?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name.slice(0, 2).toUpperCase();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl + "?t=" + Date.now());
    } catch {
      setError("Couldn't upload photo. Try again.");
      setAvatarUrl(initialAvatarUrl ?? null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Avatar + camera badge wrapper — badge is OUTSIDE overflow-hidden */}
      <div className="relative mb-3 cursor-pointer" onClick={() => !avatarUploading && fileInputRef.current?.click()}>
        {/* Circle avatar */}
        <div
          className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "2.5px solid rgba(255,255,255,0.4)" }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Camera badge — outside overflow-hidden, sits on top */}
        <div
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "#D4A017", border: "2px solid rgba(6,81,48,0.8)" }}
          aria-label="Change profile photo"
        >
          {avatarUploading ? (
            <span className="animate-spin text-white text-[10px]">◌</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </div>
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
