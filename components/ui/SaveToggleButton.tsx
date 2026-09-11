"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { subscribeToSavedItems, getSavedItemsSnapshot, toggleSavedItem } from "@/lib/customer/saved-items-client";
import { cn } from "@/lib/utils";
import type { SavedItemType } from "@/types";

export function SaveToggleButton({
  itemType,
  itemId,
  size = "md",
  className,
}: {
  itemType: SavedItemType;
  itemId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const items = useSyncExternalStore(subscribeToSavedItems, getSavedItemsSnapshot, getSavedItemsSnapshot);
  const saved = items.some((i) => i.itemType === itemType && i.itemId === itemId);
  const dims = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? 15 : 17;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleSavedItem(itemType, itemId);
      }}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={cn(
        dims,
        "rounded-full border flex items-center justify-center transition-colors shrink-0",
        saved ? "border-error/40 text-error bg-white" : "border-outline-variant text-ink-variant bg-white hover:border-error hover:text-error",
        className
      )}
    >
      <Heart size={iconSize} className={saved ? "fill-error" : ""} />
    </button>
  );
}
