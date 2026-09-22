export default function Loading() {
  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--mk-cream)" }}>
      <div style={{ background: "linear-gradient(135deg, #065130 0%, #0A6B3E 100%)" }}
        className="px-5 pt-10 pb-5">
        <div className="h-7 w-32 rounded-lg mb-2 animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="h-4 w-40 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
      <div className="px-4 pt-4 space-y-3">
        <div className="h-12 rounded-xl animate-pulse" style={{ background: "#D4A017", opacity: 0.3 }} />
        {[0,1,2,3,4].map(i => (
          <div key={i} className="rounded-xl bg-white border h-14 animate-pulse" style={{ borderColor: "var(--mk-border)" }} />
        ))}
      </div>
    </main>
  );
}
