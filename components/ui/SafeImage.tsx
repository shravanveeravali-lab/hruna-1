"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function SafeImage({
  src,
  alt,
  sizes,
  className,
  fallbackIconSize = 20,
}: {
  src?: string;
  alt: string;
  sizes?: string;
  className?: string;
  fallbackIconSize?: number;
}) {
  const [errored, setErrored] = useState(false);

  // Reset the error state if a new src comes in (e.g. after a banner/avatar edit).
  useEffect(() => setErrored(false), [src]);

  if (!src || errored) {
    return (
      <div className={cn("w-full h-full bg-surface-container flex items-center justify-center text-outline", className)}>
        <ImageOff size={fallbackIconSize} />
      </div>
    );
  }

  return <Image src={src} alt={alt} fill sizes={sizes} className={className} onError={() => setErrored(true)} />;
}
