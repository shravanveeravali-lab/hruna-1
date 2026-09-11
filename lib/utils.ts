import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Plain clsx (no conflict resolution) let a caller-supplied className sit alongside a component's
// own base classes rather than override them — e.g. Button's `bg-primary text-white` plus a call
// site's `className="bg-white text-ink"` both ended up in the DOM, and which one actually painted
// was decided by Tailwind's CSS source order, not by which was passed last. On the landing hero
// this produced a white pill button with invisible white-on-white text. twMerge resolves same-
// utility-group conflicts (bg-*, text-*, border-*, etc.) by keeping the last one, matching what
// every caller of cn() already assumed was happening.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
