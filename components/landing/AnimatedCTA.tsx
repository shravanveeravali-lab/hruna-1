"use client";

import { useRef, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import { Pin } from "./Tape";

// Wraps the existing LinkButton with a subtle magnetic-hover pull (button drifts a few px toward
// the cursor, snaps back on leave) and an optional pin accent — used for the hero/final-CTA
// primary buttons. Doesn't touch Button.tsx itself, same call-site-only pattern as prior passes.
export function AnimatedCTA({
  href,
  children,
  variant = "primary",
  size = "lg",
  className = "",
  withPin = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  withPin?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    setOffset({ x: Math.max(-8, Math.min(8, x)), y: Math.max(-6, Math.min(6, y)) });
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      className="relative inline-block transition-transform duration-200 ease-out"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {withPin && <Pin className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" />}
      <LinkButton href={href} variant={variant} size={size} className={className}>
        {children}
      </LinkButton>
    </div>
  );
}
