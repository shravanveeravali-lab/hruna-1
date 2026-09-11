"use client";

import { useRef, useState } from "react";

// Base "paper scrap" primitive used across the scrapbook sections — cream surface, soft shadow, a
// fixed decorative rotation, and an optional cursor-follow tilt (a few degrees max, reset on
// pointer leave) for the Designer Book / Moodboard hover interactions the brief asks for.
export function PaperCard({
  children,
  className = "",
  rotate = 0,
  tilt = false,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tiltTransform, setTiltTransform] = useState("");

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltTransform(` rotateX(${py * -6}deg) rotateY(${px * 6}deg)`);
  };
  const handleLeave = () => setTiltTransform("");

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`bg-scrapbook-cream shadow-soft transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `rotate(${rotate}deg)${tiltTransform}`, transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
