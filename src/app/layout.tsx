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
  openGraph: {
    title: "Memory Kitchen",
    description: "A mobile-first recipe sharing network for family and friends.",
    url: "https://peach-a-table.vercel.app",
    siteName: "Memory Kitchen",
    images: [{ url: "https://peach-a-table.vercel.app/og-image.png", width: 1200, height: 630, alt: "Memory Kitchen" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memory Kitchen",
    description: "A mobile-first recipe sharing network for family and friends.",
    images: ["https://peach-a-table.vercel.app/og-image.png"],
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
