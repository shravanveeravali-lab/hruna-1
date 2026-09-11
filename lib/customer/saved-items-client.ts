"use client";

/**
 * Client-side cache for the signed-in customer's saved items, shared by every SaveToggleButton
 * instance on a page (there can be many — a whole grid of dress/collection cards) so they all
 * reflect the same state and a toggle in one place updates every other button for that same item
 * immediately. Same subscribe/getSnapshot shape as lib/store.ts/lib/store-hooks.ts's existing
 * pattern, just backed by a real fetch to /api/saved-items instead of an in-memory array.
 */

let cache: { itemType: string; itemId: string }[] | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

// A stable, shared reference for the "not loaded yet" state — useSyncExternalStore requires
// getSnapshot() to return a referentially-EQUAL value across calls when nothing has changed.
// `cache ?? []` looked equivalent but isn't: `[]` allocates a NEW array literal every call, so
// while cache is still null (every page's first render, before the /api/saved-items fetch
// resolves), React sees a "different" snapshot on every check, re-renders, checks again, gets yet
// another new [], and never converges — a real "Maximum update depth exceeded" crash on first
// load, not a false alarm. Returning this one constant instead keeps the not-loaded state stable.
const EMPTY_ITEMS: { itemType: string; itemId: string }[] = [];

function emit() {
  listeners.forEach((l) => l());
}

async function ensureLoaded() {
  if (cache !== null) return;
  if (!inFlight) {
    inFlight = fetch("/api/saved-items")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        cache = (data.items ?? []).map((i: { itemType: string; itemId: string }) => ({
          itemType: i.itemType,
          itemId: i.itemId,
        }));
        emit();
      })
      .catch(() => {
        cache = [];
        emit();
      })
      .finally(() => {
        inFlight = null;
      });
  }
  await inFlight;
}

export function subscribeToSavedItems(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSavedItemsSnapshot() {
  return cache ?? EMPTY_ITEMS;
}

export function isSaved(itemType: string, itemId: string): boolean {
  return (cache ?? EMPTY_ITEMS).some((i) => i.itemType === itemType && i.itemId === itemId);
}

/** Optimistically flips local cache state, then confirms with the server — reverts on failure. */
export async function toggleSavedItem(itemType: string, itemId: string): Promise<void> {
  const wasSaved = isSaved(itemType, itemId);
  cache = wasSaved
    ? (cache ?? []).filter((i) => !(i.itemType === itemType && i.itemId === itemId))
    : [...(cache ?? []), { itemType, itemId }];
  emit();

  try {
    const res = await fetch("/api/saved-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
    if (!res.ok) throw new Error("toggle failed");
  } catch {
    // Revert the optimistic update.
    cache = wasSaved
      ? [...(cache ?? []), { itemType, itemId }]
      : (cache ?? []).filter((i) => !(i.itemType === itemType && i.itemId === itemId));
    emit();
  }
}
