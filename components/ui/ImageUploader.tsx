"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageUploader({
  images,
  onChange,
  max = 6,
  label = "Upload images",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = max - images.length;
    const next = Array.from(files)
      .slice(0, remaining)
      .map((f) => URL.createObjectURL(f));
    if (next.length) onChange([...images, ...next]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="relative w-24 h-24 rounded-sm overflow-hidden border border-outline-variant group">
            <Image src={src} alt={`Upload ${i + 1}`} fill sizes="96px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label="Remove image"
              className="absolute top-1 right-1 bg-ink/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "w-24 h-24 rounded-sm border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-1 text-outline hover:border-primary hover:text-primary transition-colors"
            )}
          >
            <ImagePlus size={20} />
            <span className="text-[11px]">{label}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-outline mt-2">
        {images.length}/{max} images added
      </p>
    </div>
  );
}
