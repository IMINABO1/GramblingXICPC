import Link from "next/link";

export function DiamondLogo() {
  return (
    <Link href="/" className="group flex-shrink-0" aria-label="Home">
      <div
        className="relative overflow-hidden border border-white/10 transition-all group-hover:border-accent/40 group-hover:shadow-[0_0_12px_rgba(0,255,163,0.15)]"
        style={{
          width: 34,
          height: 34,
          transform: "rotate(45deg)",
          borderRadius: 4,
        }}
      >
        {/* Left half — ACM blue */}
        <div
          className="absolute inset-0"
          style={{
            background: "#2563eb",
            clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
          }}
        />
        {/* Right half — Grambling gold */}
        <div
          className="absolute inset-0"
          style={{
            background: "#d4a017",
            clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
          }}
        />
        {/* ACM text */}
        <span
          className="absolute left-[3px] top-1/2 font-heading text-[7px] font-bold text-white"
          style={{ transform: "rotate(-45deg) translateY(-50%)" }}
        >
          ACM
        </span>
        {/* G letter */}
        <span
          className="absolute right-[5px] top-1/2 font-heading text-[13px] font-black text-white"
          style={{ transform: "rotate(-45deg) translateY(-50%)" }}
        >
          G
        </span>
      </div>
    </Link>
  );
}
