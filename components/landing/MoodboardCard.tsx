import { PaperCard } from "./PaperCard";
import { Pin } from "./Tape";
import { SafeImage } from "@/components/ui/SafeImage";
import type { Dress } from "@/types";

// A single real dress, pinned to the moodboard. Real image/fabric/description straight from the
// `dresses` table — nothing invented. `designerName` is optional (cross-referenced by the caller
// from the same designers list already fetched for the Designer Book).
export function MoodboardCard({
  dress,
  designerName,
  rotate = 0,
  offsetY = 0,
  sizeClass = "w-40 sm:w-48",
}: {
  dress: Dress;
  designerName?: string;
  rotate?: number;
  offsetY?: number;
  sizeClass?: string;
}) {
  const description = dress.description?.trim();
  return (
    <div className={sizeClass} style={{ marginTop: offsetY }}>
      <PaperCard rotate={rotate} tilt className="relative group p-2.5 pb-4">
        <Pin className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" />
        <div className="relative w-full aspect-[3/4] overflow-hidden mb-2 bg-surface-container">
          <SafeImage
            src={dress.images?.[0]}
            alt={dress.name}
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        {dress.fabric && (
          <p className="text-[10px] uppercase tracking-[0.1em] text-scrapbook-moss font-medium px-1">{dress.fabric}</p>
        )}
        {description && (
          <p className="font-hand text-lg text-ink-variant leading-tight mt-1 px-1">
            {description.length > 60 ? `${description.slice(0, 60)}…` : description}
          </p>
        )}
        {designerName && <p className="text-[10px] text-outline mt-1 px-1">by {designerName}</p>}
      </PaperCard>
    </div>
  );
}
