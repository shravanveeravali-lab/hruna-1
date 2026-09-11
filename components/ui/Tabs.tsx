"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { label: string; value: string; count?: number }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-outline-variant overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
            active === tab.value ? "text-ink" : "text-outline hover:text-ink-variant"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className="ml-1.5 text-xs text-outline">({tab.count})</span>
          )}
          {active === tab.value && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
