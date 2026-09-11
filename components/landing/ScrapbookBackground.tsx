// The shared "paper" system behind every landing-page section — cream/gingham/graph-paper
// variants, all pure CSS (see globals.css), plus an optional torn-edge divider so each section
// reads as another page of the same scrapbook rather than a different website.
export function ScrapbookBackground({
  variant = "cream",
  tornTop,
  tornBottom,
  className = "",
}: {
  variant?: "cream" | "gingham" | "graph";
  tornTop?: boolean;
  tornBottom?: boolean;
  className?: string;
}) {
  const bgClass = variant === "gingham" ? "bg-gingham" : variant === "graph" ? "bg-graph-paper" : "bg-scrapbook-cream";
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${bgClass} ${className}`} aria-hidden="true">
      <div className="paper-grain" />
      {tornTop && <div className="torn-edge-top" style={{ "--torn-color": "#F7F4D5" } as React.CSSProperties} />}
      {tornBottom && <div className="torn-edge-bottom" style={{ "--torn-color": "#F7F4D5" } as React.CSSProperties} />}
    </div>
  );
}
