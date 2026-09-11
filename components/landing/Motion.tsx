"use client";

import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

// Only the intrinsic tags actually used by landing-page call sites — indexing `motion` with one
// of these is statically valid (motion.div / motion.section / motion.li are real exports).
type MotionTag = "div" | "section" | "li";

// Shared scroll/entrance motion for the landing page, built on Framer Motion per the luxury-
// editorial brief. Replaces the prior IntersectionObserver-based `Reveal` component. Every piece
// here respects `useReducedMotion()` — on top of the existing global CSS `prefers-reduced-motion`
// override in globals.css that still catches any plain CSS transitions elsewhere on the page.

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades a single element up into place once it scrolls into view. */
export function FadeUp({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: MotionTag;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </Tag>
  );
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Orchestrates a fade-up-in-sequence for its `StaggerItem` children once in view. */
export function Stagger({
  children,
  className,
  as = "div",
  stagger = 0.12,
}: {
  children: ReactNode;
  className?: string;
  as?: MotionTag;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "visible"}
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Tag>
  );
}

/** One item inside a `Stagger` — inherits hidden/visible timing from the parent. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: MotionTag;
}) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={staggerItem}>
      {children}
    </Tag>
  );
}

/** Subtle scroll-linked drift for the hero image — moves slower than the page as it scrolls by. */
export function Parallax({
  children,
  className,
  range = 60,
}: {
  children: ReactNode;
  className?: string;
  range?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : range]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
