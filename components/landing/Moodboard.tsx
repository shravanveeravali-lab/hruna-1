import { MoodboardCard } from "./MoodboardCard";
import type { Dress, Designer } from "@/types";

// Fixed per-index arrays (not Math.random()) for the organic, non-grid moodboard composition —
// same deterministic-array technique used for the polaroid stack two passes ago, so server and
// client render identically and nothing shifts on hydration.
const ROTATIONS = [-6, 4, -3, 7, -8, 5, -4, 6, -5, 3];
const OFFSETS_Y = [0, 44, 12, 60, 20, 0, 52, 16, 30, 8];
const SIZES = [
  "w-36 sm:w-44",
  "w-40 sm:w-48",
  "w-32 sm:w-40",
  "w-40 sm:w-52",
  "w-36 sm:w-44",
  "w-40 sm:w-48",
  "w-32 sm:w-40",
  "w-40 sm:w-52",
  "w-36 sm:w-44",
  "w-40 sm:w-48",
];

export function Moodboard({ dresses, designersById }: { dresses: Dress[]; designersById: Map<string, Designer> }) {
  if (dresses.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="font-display text-2xl text-scrapbook-forest mb-3">The Moodboard</p>
        <p className="text-ink-variant">New pieces are being pinned up — check back soon.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-10 md:gap-x-7">
      {dresses.map((dress, i) => (
        <MoodboardCard
          key={dress.id}
          dress={dress}
          designerName={designersById.get(dress.designerId)?.studioName}
          rotate={ROTATIONS[i % ROTATIONS.length]}
          offsetY={OFFSETS_Y[i % OFFSETS_Y.length]}
          sizeClass={SIZES[i % SIZES.length]}
        />
      ))}
    </div>
  );
}
