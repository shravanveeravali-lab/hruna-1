"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Stagger, StaggerItem } from "./Motion";
import { FlowerDoodle, ScissorsDoodle, ThreadDoodle } from "./Doodles";

const ACCENTS = [FlowerDoodle, ThreadDoodle, ScissorsDoodle, FlowerDoodle, ThreadDoodle];

export function RouteMap({ steps }: { steps: { num: string; title: string; copy: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks this whole map's scroll progress through the viewport — the decorative squiggle draws
  // in step with it, while the real connector (a plain dashed line) reliably links every step
  // regardless of how the squiggle happens to look on a given screen size.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.3"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      {/* Decorative hand-drawn-feeling squiggle, drawn in as you scroll through the map. */}
      <svg
        viewBox="0 0 300 900"
        preserveAspectRatio="none"
        className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-full text-scrapbook-midnight/25"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M150 10 C 90 90, 210 150, 150 230 S 90 370, 150 450 S 210 590, 150 670 S 90 810, 150 890"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ pathLength }}
        />
      </svg>
      {/* Reliable literal connector — always joins every marker regardless of viewport width. */}
      <div
        className="absolute left-6 md:left-1/2 top-2 bottom-2 w-px border-l-2 border-dashed border-scrapbook-forest/20 md:-translate-x-1/2"
        aria-hidden="true"
      />

      <Stagger className="relative flex flex-col gap-16 md:gap-24" stagger={0.16}>
        {steps.map((step, i) => {
          const flip = i % 2 === 1;
          const Accent = ACCENTS[i % ACCENTS.length];
          const marker = (
            <div className="w-12 h-12 rounded-full bg-scrapbook-forest text-scrapbook-cream flex items-center justify-center font-display text-sm shrink-0 shadow-soft">
              {step.num}
            </div>
          );
          const textBlock = (
            <>
              <h3 className="text-headline-sm text-scrapbook-forest">{step.title}</h3>
              <p className="text-ink-variant text-body-md mt-2 max-w-xs">{step.copy}</p>
            </>
          );
          return (
            <StaggerItem key={step.num}>
              {/* Mobile: single left column */}
              <div className="flex md:hidden items-start gap-5">
                {marker}
                <div className="pt-1">{textBlock}</div>
              </div>
              {/* Desktop: alternating around the spine, with a small doodle balancing the empty side */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:gap-x-10 items-center">
                <div className={flip ? "order-3 flex items-center gap-4" : "order-1 flex justify-end"}>
                  {flip && <Accent className="text-scrapbook-rose shrink-0" size={26} />}
                  <div className={flip ? "" : "text-right"}>{textBlock}</div>
                </div>
                <div className="order-2 flex justify-center">{marker}</div>
                <div className={`flex items-center ${flip ? "order-1 justify-end" : "order-3"}`}>
                  {!flip && <Accent className="text-scrapbook-rose shrink-0" size={26} />}
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
