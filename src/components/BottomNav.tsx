"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/",         label: "Menu",    icon: "🗓️" },
  { href: "/recipes",  label: "Recipes", icon: "📖" },
  { href: "/profile",  label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t flex"
      style={{
        borderColor: "var(--mk-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 40,
      }}
    >
      {TABS.map(tab => {
        const isActive =
          tab.href === "/" ? path === "/" : path.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
            style={{ color: isActive ? "var(--mk-terracotta)" : "#bbb" }}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
