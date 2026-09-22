// Root loading state (menu tab)
export default function Loading() {
  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>
      {/* Banner skeleton */}
      <div style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-6">
        <div className="h-7 w-48 rounded-lg mb-2 animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="h-4 w-32 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
      {/* Day cards skeleton */}
      <div className="px-4 pt-4 space-y-3">
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} className="rounded-2xl bg-white border h-16 animate-pulse" style={{ borderColor: "var(--mk-border)" }} />
        ))}
      </div>
    </main>
  );
}
