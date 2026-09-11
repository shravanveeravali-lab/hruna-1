// A small decorative washi-tape strip. Purely cosmetic (aria-hidden) — never carries meaning on
// its own, so it's safe to sprinkle without affecting screen-reader users.
export function Tape({
  rotate = -4,
  color = "rose",
  className = "",
}: {
  rotate?: number;
  color?: "rose" | "moss" | "cream";
  className?: string;
}) {
  const bg = color === "moss" ? "bg-scrapbook-moss/40" : color === "cream" ? "bg-scrapbook-cream/80 border border-scrapbook-forest/10" : "bg-scrapbook-rose/50";
  return (
    <div
      className={`w-16 h-6 ${bg} shadow-sm ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    />
  );
}

// A small round pin/thumbtack accent.
export function Pin({ color = "#D3968C", className = "" }: { color?: string; className?: string }) {
  return (
    <span
      className={`block w-3.5 h-3.5 rounded-full shadow-md ${className}`}
      style={{ background: `radial-gradient(circle at 35% 30%, #fff8, transparent 40%), ${color}` }}
      aria-hidden="true"
    />
  );
}
