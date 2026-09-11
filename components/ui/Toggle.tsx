"use client";

import { cn } from "@/lib/utils";

/**
 * Shared ON/OFF switch — the one real toggle-switch control in the app (everything else in the
 * Admin Panel that looks pill-shaped, e.g. filter chips and status badges, is a different kind of
 * control and isn't touched by this). Previously defined inline inside
 * app/admin/subscriptions/page.tsx with cramped, inconsistent spacing between the switch and its
 * ON/OFF text; extracted here so it's a single, reusable, correctly-spaced component instead of
 * page-specific positioning. Visual only — callers own all state/logic, exactly as before.
 *
 * `label` is optional and renders as the switch's own trailing ON/OFF word (used when a caller
 * wants the switch to carry its own status text, e.g. the master toggle here). When a caller
 * instead renders its own label text beside the switch (e.g. "Customer subscriptions" to its
 * left), pass `label={false}` to omit it and avoid a duplicate status word.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  inactive,
  showLabel = true,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /** Dims a toggle that's genuinely ON in the database but not currently having any effect (e.g.
   *  a per-role subscription switch while the master switch is off). Visual only — never changes
   *  what it's actually set to. */
  inactive?: boolean;
  /** Set false to render just the switch, with no trailing ON/OFF word (the caller supplies its
   *  own label instead). */
  showLabel?: boolean;
}) {
  const isOn = checked && !inactive;
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className="inline-flex items-center gap-2.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span
        className={cn(
          "w-10 h-[22px] rounded-full relative shrink-0 transition-colors duration-150",
          isOn ? "bg-emerald-500" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked && "translate-x-[18px]"
          )}
        />
      </span>
      {showLabel && (
        <span className={cn("text-xs font-medium w-8 text-left leading-none", isOn ? "text-emerald-400" : "text-white/40")}>
          {checked ? "ON" : "OFF"}
        </span>
      )}
    </button>
  );
}
