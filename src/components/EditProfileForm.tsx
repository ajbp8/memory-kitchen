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

    // Preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Determine extension from mime type
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (dbError) throw dbError;

      // Add cache-buster so the browser reloads the image
      setAvatarUrl(publicUrl + "?t=" + Date.now());
    } catch {
      setError("Couldn't upload photo. Try again.");
      setAvatarUrl(initialAvatarUrl ?? null);
    } finally {
      setAvatarUploading(false);
      // Reset input so re-selecting the same file triggers onChange
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

      {/* Tappable avatar */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={avatarUploading}
        className="relative w-20 h-20 rounded-full mb-3 overflow-hidden flex-shrink-0 focus:outline-none"
        style={{ border: "2.5px solid rgba(255,255,255,0.4)" }}
        aria-label="Change profile photo"
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

        {/* Camera badge */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: "#D4A017", color: "white" }}
        >
          {avatarUploading ? (
            <span className="animate-spin text-[9px]">◌</span>
          ) : (
            <span>📷</span>
          )}
        </div>
      </button>

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
