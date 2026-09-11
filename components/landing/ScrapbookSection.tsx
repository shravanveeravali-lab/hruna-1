import { ScrapbookBackground } from "./ScrapbookBackground";

// Thin section wrapper: ScrapbookBackground + consistent padding, used by all 6 landing sections
// so they read as pages of the same scrapbook rather than six different layouts.
export function ScrapbookSection({
  children,
  variant = "cream",
  tornTop,
  tornBottom,
  className = "",
  id,
}: {
  children: React.ReactNode;
  variant?: "cream" | "gingham" | "graph";
  tornTop?: boolean;
  tornBottom?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`relative py-20 md:py-28 overflow-hidden ${className}`}>
      <ScrapbookBackground variant={variant} tornTop={tornTop} tornBottom={tornBottom} />
      <div className="container-editorial relative">{children}</div>
    </section>
  );
}
