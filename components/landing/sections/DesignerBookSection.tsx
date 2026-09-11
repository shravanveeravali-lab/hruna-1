import { ScrapbookSection } from "@/components/landing/ScrapbookSection";
import { DesignerBook } from "@/components/landing/DesignerBook";
import type { Designer } from "@/types";

// Section 03 — the HRUNA Designer Book, wired to real approved designers.
export function DesignerBookSection({ designers }: { designers: Designer[] }) {
  return (
    <ScrapbookSection variant="cream" tornTop tornBottom>
      <div className="text-center mb-14">
        <p className="text-label-md text-scrapbook-moss mb-3">THE HRUNA DESIGNER BOOK</p>
        <h2 className="font-display text-4xl md:text-5xl text-scrapbook-forest">Every page, a real studio.</h2>
      </div>
      <DesignerBook designers={designers} />
    </ScrapbookSection>
  );
}
