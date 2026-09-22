import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import AuthSessionListener from "@/components/AuthSessionListener";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "Memory Kitchen",
  description: "A mobile-first recipe sharing network for family and friends.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Memory Kitchen",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B5E2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased pb-16"
        style={{ background: "#e8e4df" }}
      >
        <SplashScreen />
        <AuthSessionListener />
        <RegisterSW />
        <div className="max-w-md mx-auto relative min-h-dvh bg-[var(--mk-cream)]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
