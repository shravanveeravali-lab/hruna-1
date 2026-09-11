"use client";

import Image from "next/image";
import { useRef, useState } from "react";

// The one real photograph in the hero collage — reacts subtly to the cursor (a small capped
// translate, not a dramatic 3D tilt) when hovered, per the brief's "photographs should slightly
// react to cursor movement." Everything else in the hero stays static; only this element moves.
export function HeroPhoto({
  src,
  alt,
  rotate = -4,
  className = "",
}: {
  src: string;
  alt: string;
  rotate?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
    setOffset({ x, y });
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      className={`bg-white p-3 pb-6 shadow-lift transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `rotate(${rotate}deg) translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-surface-container">
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 70vw, 380px" className="object-cover" />
      </div>
    </div>
  );
}
