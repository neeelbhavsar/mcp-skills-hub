/** Ambient animated glow blobs — pure CSS, respects reduced-motion. */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div
        className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px] animate-aurora"
        style={{ background: "radial-gradient(circle, #7c6bff 0%, transparent 65%)" }}
      />
      <div
        className="absolute top-10 right-[-10rem] h-[34rem] w-[34rem] rounded-full opacity-30 blur-[120px] animate-aurora"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 65%)", animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-[-12rem] left-[-6rem] h-[30rem] w-[30rem] rounded-full opacity-25 blur-[120px] animate-aurora"
        style={{ background: "radial-gradient(circle, #34d399 0%, transparent 65%)", animationDelay: "-11s" }}
      />
    </div>
  );
}
