"use client";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show once per browser session (not on every tab switch)
    try {
      if (sessionStorage.getItem("mk_splash")) return;
      sessionStorage.setItem("mk_splash", "1");
    } catch {
      return; // If sessionStorage unavailable, skip splash
    }

    setVisible(true);
    const fadeTimer  = setTimeout(() => setFading(true),  1500);
    const hideTimer  = setTimeout(() => setVisible(false), 8000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center px-8"
      style={{
        background: "linear-gradient(135deg, #1B5E2E 0%, #2E7A3E 100%)",
        transition: "opacity 0.55s ease",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Title */}
      <p style={{
        color: "white",
        fontWeight: 900,
        fontSize: "clamp(22px, 6vw, 28px)",
        letterSpacing: "-0.5px",
        textAlign: "center",
        lineHeight: 1.2,
        marginBottom: "28px",
      }}>
        Welcome to<br />Memory Kitchen
      </p>

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="Memory Kitchen"
        style={{ width: 120, height: 120, borderRadius: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
      />

      {/* Tagline */}
      <p style={{
        color: "rgba(255,255,255,0.78)",
        fontSize: "clamp(14px, 4vw, 16px)",
        fontWeight: 500,
        textAlign: "center",
        lineHeight: 1.55,
        marginTop: "28px",
        maxWidth: "280px",
      }}>
        Create weekly menus with your<br />friends &amp; family&apos;s favorite recipes
      </p>
    </div>
  );
}
