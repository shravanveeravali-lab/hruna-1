import "server-only";

/**
 * Real subscription-gate check (Phase 7 fix, extended Phase 8 for real Razorpay-backed state) —
 * app/(app)/layout.tsx and app/(designer)/layout.tsx wrap EVERY customer/designer page in
 * <SubscriptionGate>; both read from here, never the mock store. `payment_system_enabled` stays
 * the master switch (Phase 6 admin control) — while it's off (still the seeded default), access
 * is unconditionally granted and nothing here calls Razorpay or touches payment state at all.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Supa = SupabaseClient<Database>;

export interface SubscriptionAccess {
  hasAccess: boolean;
  plan: { name: string; price: number; currency: string } | null;
}

export async function getSubscriptionAccess(supabase: Supa, userId: string, role: "customer" | "designer"): Promise<SubscriptionAccess> {
  const { data: settings } = await supabase.from("payment_settings").select("*").eq("id", true).maybeSingle();
  const required =
    !!settings?.payment_system_enabled &&
    (role === "customer" ? settings?.customer_subscriptions_enabled : settings?.designer_subscriptions_enabled);

  if (!required) return { hasAccess: true, plan: null };

  // Safe as `.maybeSingle()`: the partial unique index user_subscriptions_one_active_per_role
  // guarantees at most one row can ever match `status = 'active'` for a given (user_id, role).
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("status, end_date")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("status", "active")
    .maybeSingle();
  const hasAccess = !!sub && (!sub.end_date || new Date(sub.end_date).getTime() >= Date.now());
  if (hasAccess) return { hasAccess: true, plan: null };

  const { data: planRow } = await supabase.from("subscription_plans").select("name, price, currency").eq("role", role).maybeSingle();
  return {
    hasAccess: false,
    plan: planRow ? { name: planRow.name, price: Number(planRow.price), currency: planRow.currency } : null,
  };
}

export interface SubscriptionSummary {
  enforced: boolean;
  plan: { name: string; price: number; currency: string; billingInterval: string; description: string; features: string[] } | null;
  subscription: { status: string; renewalDate: string | null; endDate: string | null } | null;
}

/** Full display data for the Subscription page. Read + a real Razorpay checkout/verify/cancel flow
 *  now sits in front of it (app/api/payments/*) — this stays read-only itself, resolving whatever
 *  the database says after those routes have run. */
export async function getSubscriptionSummary(supabase: Supa, userId: string, role: "customer" | "designer"): Promise<SubscriptionSummary> {
  const [{ data: settings }, { data: planRow }, { data: subRows }] = await Promise.all([
    supabase.from("payment_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("subscription_plans").select("*").eq("role", role).maybeSingle(),
    // Not `.maybeSingle()` — a user can accumulate multiple HISTORICAL rows over time (expired/
    // cancelled ones are never deleted, by design, for audit purposes), so more than one row for
    // this (user_id, role) is the expected long-run state, not a bug. Most recent one wins for
    // display purposes.
    supabase
      .from("user_subscriptions")
      .select("status, renewal_date, end_date")
      .eq("user_id", userId)
      .eq("role", role)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const enforced = !!settings?.payment_system_enabled && !!(role === "customer" ? settings?.customer_subscriptions_enabled : settings?.designer_subscriptions_enabled);
  const subRow = subRows?.[0] ?? null;

  // Lazy display-only expiry: an `active` row past its own end_date reads as "expired" here
  // without writing anything — there's no cron in this environment to flip the stored status, and
  // getSubscriptionAccess above already independently treats a past-end_date row as no access
  // regardless of its stored status, so this is purely cosmetic (never a second source of truth
  // for whether access is actually granted).
  const displayStatus =
    subRow?.status === "active" && subRow.end_date && new Date(subRow.end_date).getTime() < Date.now() ? "expired" : subRow?.status;

  return {
    enforced,
    plan: planRow
      ? {
          name: planRow.name,
          price: Number(planRow.price),
          currency: planRow.currency,
          billingInterval: planRow.billing_interval,
          description: planRow.description ?? "",
          features: planRow.features,
        }
      : null,
    subscription: subRow ? { status: displayStatus!, renewalDate: subRow.renewal_date, endDate: subRow.end_date } : null,
  };
}
