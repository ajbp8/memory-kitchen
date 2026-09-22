export default function Loading() {
  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>
      <div style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-8 text-center">
        {/* Avatar skeleton */}
        <div className="w-20 h-20 rounded-full mx-auto mb-3 animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="h-5 w-32 rounded-lg mx-auto mb-1 animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="h-4 w-20 rounded-lg mx-auto animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
      <div className="px-5 mt-5 space-y-3">
        <div className="h-24 rounded-xl animate-pulse bg-white border" style={{ borderColor: "var(--mk-border)" }} />
        <div className="h-12 rounded-xl animate-pulse" style={{ background: "#065130", opacity: 0.3 }} />
      </div>
    </main>
  );
}
