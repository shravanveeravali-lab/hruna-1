/**
 * Cancels the signed-in user's own active subscription for the given role (Phase 8). Immediate
 * cancellation (status -> 'cancelled' right away), not a "stays active until end_date" grace
 * period — the existing status vocabulary (none/active/expired/cancelled) has no state for
 * "cancelled but still has access", and inventing one would be exactly the kind of duplicate
 * status system the brief says to avoid. This also means SubscriptionGate/getSubscriptionAccess
 * (lib/subscription-access.ts) need no changes at all: they already only grant access on
 * status === 'active'.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import type { Enums } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    const body = await request.json().catch(() => null);
    const role = body?.role as Enums<"subscriber_role"> | undefined;
    if (role !== "customer" && role !== "designer") {
      return NextResponse.json({ status: "error", message: "role must be 'customer' or 'designer'." }, { status: 400 });
    }

    // Service-role: user_subscriptions_admin_write RLS is admin-only, same reasoning as checkout —
    // ctx.user.id is the authenticated caller's own id, and the WHERE clause below scopes the
    // update to their own row only, never a client-supplied target.
    const admin = createAdminClient();
    const { data: cancelled, error } = await admin
      .from("user_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", ctx.user.id)
      .eq("role", role)
      .eq("status", "active")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!cancelled) {
      return NextResponse.json({ status: "error", message: "You don't have an active subscription to cancel." }, { status: 404 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.payments.cancel");
  }
}
