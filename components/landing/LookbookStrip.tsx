import { SafeImage } from "@/components/ui/SafeImage";
import type { Dress } from "@/types";

// A hover/focus-expand accordion strip of real pieces — captures the same effect as the
// React-Bits AccordionGallery reference without pulling in gsap: pure CSS `flex-grow` transition,
// each panel expanding as you hover/focus across the row. Real dress images only.
export function LookbookStrip({ dresses }: { dresses: Dress[] }) {
  if (dresses.length < 3) return null;
  return (
    <div className="flex gap-2 h-64 md:h-80 rounded-md overflow-hidden shadow-soft">
      {dresses.slice(0, 6).map((dress) => (
        <div
          key={dress.id}
          tabIndex={0}
          className="group relative flex-[1] hover:flex-[3] focus:flex-[3] transition-[flex-grow] duration-500 ease-out outline-none cursor-pointer min-w-0"
        >
          <SafeImage
            src={dress.images?.[0]}
            alt={dress.name}
            sizes="(max-width: 768px) 40vw, 300px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-scrapbook-forest/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-500" />
          <p className="absolute bottom-3 left-3 right-2 text-scrapbook-cream text-sm font-medium opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-500 truncate">
            {dress.name}
          </p>
        </div>
      ))}
    </div>
  );
}
