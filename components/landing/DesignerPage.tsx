import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PaperCard } from "./PaperCard";
import { Tape } from "./Tape";
import { SafeImage } from "@/components/ui/SafeImage";
import { RatingDisplay } from "@/components/ui/Rating";
import type { Designer } from "@/types";

// A single real designer, styled as a scrapbook/editorial book page rather than a standard UI
// card. Real data only (SafeImage falls back gracefully if a banner/avatar is missing — never a
// stand-in stock photo); `bio` is the designer's own real bio, shown as the "quote," never invented.
export function DesignerPage({ designer, rotate = 0 }: { designer: Designer; rotate?: number }) {
  const bio = designer.bio?.trim();
  return (
    <PaperCard rotate={rotate} tilt className="p-4 pb-6 relative group h-full flex flex-col">
      <Tape rotate={rotate >= 0 ? -8 : 8} className="absolute -top-3 left-8 z-10" />
      <div className="relative w-full aspect-[4/3] overflow-hidden mb-4 shadow-sm">
        <SafeImage
          src={designer.banner || designer.avatar}
          alt={designer.studioName}
          sizes="(max-width: 768px) 80vw, 320px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-scrapbook-cream shadow-sm">
          <SafeImage src={designer.avatar} alt={designer.name} sizes="40px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg text-scrapbook-forest truncate">{designer.studioName}</p>
          <p className="text-xs text-ink-variant">{designer.city}</p>
        </div>
      </div>
      {designer.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {designer.specializations.slice(0, 2).map((s) => (
            <span key={s} className="text-[11px] bg-scrapbook-moss/15 text-scrapbook-forest px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}
      {bio && (
        <p className="font-hand text-xl text-ink-variant leading-snug mb-3 flex-1">
          "{bio.length > 100 ? `${bio.slice(0, 100)}…` : bio}"
        </p>
      )}
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-scrapbook-forest/10">
        <RatingDisplay value={designer.rating} />
        <Link href={`/studio/${designer.id}`} className="group/link inline-flex items-center gap-1 text-sm font-medium text-scrapbook-forest">
          View Studio
          <ArrowRight size={14} className="transition-transform duration-300 group-hover/link:translate-x-1" />
        </Link>
      </div>
    </PaperCard>
  );
}
