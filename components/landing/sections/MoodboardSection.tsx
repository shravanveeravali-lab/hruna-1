import { ScrapbookSection } from "@/components/landing/ScrapbookSection";
import { Moodboard } from "@/components/landing/Moodboard";
import { LookbookStrip } from "@/components/landing/LookbookStrip";
import type { Dress, Designer } from "@/types";

// Section 04 — the HRUNA Moodboard, wired to real dresses from approved designers.
export function MoodboardSection({ dresses, designersById }: { dresses: Dress[]; designersById: Map<string, Designer> }) {
  return (
    <ScrapbookSection variant="gingham" tornTop tornBottom>
      <div className="text-center mb-14">
        <p className="text-label-md text-scrapbook-moss mb-3">THE HRUNA MOODBOARD</p>
        <h2 className="font-display text-4xl md:text-5xl text-scrapbook-forest leading-tight">
          Find your mood.
          <br />
          Then find your dress.
        </h2>
      </div>
      <Moodboard dresses={dresses} designersById={designersById} />
      {dresses.length >= 3 && (
        <div className="mt-20">
          <p className="text-label-md text-scrapbook-moss mb-4 text-center">EXPLORE LOOKS</p>
          <LookbookStrip dresses={dresses} />
        </div>
      )}
    </ScrapbookSection>
  );
}
