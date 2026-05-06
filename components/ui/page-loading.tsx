export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      {/* Ring stack */}
      <div className="relative h-20 w-20">
        {/* Ambient glow behind everything */}
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgb(var(--brand-mint-500)), transparent 70%)",
            animationDuration: "2s",
          }}
        />

        {/* Outermost slow track (static) */}
        <span
          className="absolute inset-0 rounded-full border-[2px]"
          style={{ borderColor: "rgb(var(--brand-sky-400) / 0.5)" }}
        />

        {/* Outer ring — clockwise, mint arc */}
        <span
          className="absolute inset-0 animate-spin rounded-full border-[2px] border-transparent"
          style={{
            borderTopColor: "rgb(var(--brand-mint-500))",
            borderRightColor: "rgb(var(--brand-mint-500))",
            animationDuration: "1.2s",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Middle track (static) */}
        <span
          className="absolute inset-[10px] rounded-full border-[2px]"
          style={{ borderColor: "rgb(var(--brand-sky-400) / 0.35)" }}
        />

        {/* Middle ring — counter-clockwise, navy arc */}
        <span
          className="absolute inset-[10px] rounded-full border-[2px] border-transparent"
          style={{
            borderTopColor: "rgb(var(--brand-navy-700))",
            borderLeftColor: "rgb(var(--brand-navy-700))",
            animation: "spin 1.8s linear infinite reverse",
          }}
        />

        {/* Inner glowing core */}
        <span
          className="absolute inset-[22px] animate-pulse rounded-full"
          style={{
            background: "rgb(var(--brand-mint-600))",
            boxShadow: "0 0 12px 4px rgb(var(--brand-mint-500) / 0.5)",
            animationDuration: "1.4s",
          }}
        />
      </div>

      {/* Shimmer label — letters staggered via inline delay */}
      <p
        className="flex gap-[2px] text-xs font-semibold tracking-[0.3em] uppercase"
        style={{ color: "rgb(var(--brand-slate-500))" }}
      >
        {"載入中".split("").map((char, i) => (
          <span
            key={i}
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.4s" }}
          >
            {char}
          </span>
        ))}
      </p>
    </div>
  );
}
