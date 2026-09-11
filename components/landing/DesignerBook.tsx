"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { DesignerPage } from "./DesignerPage";
import type { Designer } from "@/types";

const EASE = [0.22, 1, 0.36, 1] as const;

// The "closed book that opens on scroll" — two cover halves rotate open in 3D once the book
// scrolls into view, then the real designer pages fade in beneath. Real data only: if there are
// no approved designers yet, shows an honest "new pages are being written" state instead of a
// crash or an empty book.
export function DesignerBook({ designers }: { designers: Designer[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  if (designers.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="font-display text-2xl text-scrapbook-forest mb-3">The Designer Book</p>
        <p className="text-ink-variant">New pages are being written — check back soon as designers join HRUNA.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative h-20 md:h-28" style={{ perspective: "1800px" }}>
        <motion.div
          className="absolute inset-y-0 left-1/2 w-1/2 bg-scrapbook-forest rounded-r-md shadow-lift flex items-center justify-center"
          initial={{ rotateY: 0 }}
          animate={inView ? { rotateY: -108 } : {}}
          transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          style={{ transformOrigin: "left center", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        >
          <span className="font-display text-scrapbook-cream text-sm md:text-lg tracking-[0.15em]">HRUNA</span>
        </motion.div>
        <motion.div
          className="absolute inset-y-0 right-1/2 w-1/2 bg-scrapbook-forest rounded-l-md shadow-lift flex items-center justify-center"
          initial={{ rotateY: 0 }}
          animate={inView ? { rotateY: 108 } : {}}
          transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          style={{ transformOrigin: "right center", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        >
          <span className="font-display text-scrapbook-cream text-xs md:text-sm tracking-[0.1em]">DESIGNER BOOK</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
      >
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
          {designers.map((d, i) => (
            <DesignerPage key={d.id} designer={d} rotate={i % 2 === 0 ? -1.5 : 1.5} />
          ))}
        </div>
        <div className="md:hidden flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar mt-10 pb-4 -mx-6 px-6">
          {designers.map((d) => (
            <div key={d.id} className="snap-center shrink-0 w-[78vw]">
              <DesignerPage designer={d} rotate={0} />
            </div>
          ))}
        </div>
        <p className="md:hidden text-center text-xs text-outline mt-2">← swipe to browse →</p>
      </motion.div>
    </div>
  );
}
