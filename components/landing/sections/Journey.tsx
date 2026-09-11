import { ScrapbookSection } from "@/components/landing/ScrapbookSection";
import { RouteMap } from "@/components/landing/RouteMap";

const STEPS = [
  { num: "01", title: "Discover", copy: "Browse a curated world of independent designers, boutiques and tailors." },
  { num: "02", title: "Explore Designers", copy: "Step into their studios — real portfolios, real craft, real people." },
  { num: "03", title: "Find Your Piece", copy: "From ready-made pieces to a fully custom commission, made your way." },
  { num: "04", title: "Make It Yours", copy: "Share your vision — measurements, fabric, budget — in one private request." },
  { num: "05", title: "Bring It Home", copy: "Track every stage, from first sketch to the final fitting at your door." },
];

// Section 02 — the journey through HRUNA, styled as a hand-drawn route map rather than a
// corporate process diagram.
export function Journey() {
  return (
    <ScrapbookSection variant="graph" tornTop tornBottom>
      <div className="text-center mb-16 md:mb-20">
        <p className="text-label-md text-scrapbook-moss mb-3">THE HRUNA JOURNEY</p>
        <h2 className="font-display text-4xl md:text-5xl text-scrapbook-forest">Your journey through Hruna</h2>
      </div>
      <RouteMap steps={STEPS} />
    </ScrapbookSection>
  );
}
