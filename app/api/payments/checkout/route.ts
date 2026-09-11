/**
 * Starts a real Razorpay checkout for the signed-in user's own customer or designer subscription
 * (Phase 8). Body: { role: "customer" | "designer" }. `role` is the ONLY client input — everything
 * else (which user, which plan, the amount) is derived server-side from the session and the
 * database, never trusted from the browser:
 *   - identity: requireUser() — never a client-supplied userId.
 *   - eligibility: the caller must actually hold the profile for the requested role
 *     (ctx.customerId / ctx.designerId), so a designer can't buy the customer plan on someone
 *     else's behalf and vice versa.
 *   - plan + price: read fresh from subscription_plans (role, is_active) — never accepted from
 *     the client, so a tampered/stale price can never reach Razorpay.
 *
 * Creates a `payments` row in `pending` status BEFORE calling Razorpay, via the service-role
 * client (payments_admin_write RLS is admin-only by design — see that migration's comment). The
 * Razorpay order id is stored on it immediately, so the webhook and /verify both have a real row
 * to correlate back to no matter which one a given payment resolves through first.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { razorpayConfig } from "@/lib/payments/config";
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

    // Eligibility — never inferred from the request, only from the caller's own real profiles.
    if (role === "customer" && !ctx.customerId) {
      return NextResponse.json({ status: "error", message: "You don't have a customer account to subscribe as." }, { status: 403 });
    }
    if (role === "designer" && !ctx.designerId) {
      return NextResponse.json({ status: "error", message: "You don't have a designer account to subscribe as." }, { status: 403 });
    }

    const supabase = createClient();

    const { data: settings, error: settingsError } = await supabase.from("payment_settings").select("*").eq("id", true).maybeSingle();
    if (settingsError) throw settingsError;
    const roleEnabled = role === "customer" ? settings?.customer_subscriptions_enabled : settings?.designer_subscriptions_enabled;
    if (!settings?.payment_system_enabled || !roleEnabled) {
      return NextResponse.json({ status: "error", message: "Payments are currently disabled." }, { status: 409 });
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("role", role)
      .eq("is_active", true)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) {
      return NextResponse.json({ status: "error", message: "No active plan is configured for this role." }, { status: 404 });
    }

    // Duplicate-checkout guard (§14) — the partial unique index on user_subscriptions is the real
    // backstop against a conflicting SECOND active row, but rejecting here gives an honest,
    // immediate message instead of letting a user pay again for something they already have.
    const { data: existingActive } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("role", role)
      .eq("status", "active")
      .maybeSingle();
    if (existingActive) {
      return NextResponse.json({ status: "error", message: "You already have an active subscription." }, { status: 409 });
    }

    // Service-role: payments_admin_write RLS is admin-only, by Phase 1's explicit design for this
    // exact flow (see 20260829180013_rls.sql's comment on that policy). ctx.user.id here is the
    // AUTHENTICATED caller's own id, never client-supplied.
    const admin = createAdminClient();
    const receipt = `sub_${ctx.user.id.slice(0, 8)}_${role}_${Date.now()}`.slice(0, 40);
    const { data: pendingPayment, error: insertError } = await admin
      .from("payments")
      .insert({
        user_id: ctx.user.id,
        plan_id: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: "pending",
        payment_provider: "razorpay",
      })
      .select()
      .single();
    if (insertError) throw insertError;

    let order;
    try {
      order = await createRazorpayOrder({
        amount: Number(plan.price),
        currency: plan.currency,
        receipt,
        notes: { userId: ctx.user.id, role, planId: plan.id, paymentId: pendingPayment.id },
      });
    } catch (razorpayErr) {
      // Never leave an orphaned pending row if Razorpay itself rejected the order — mark it failed
      // so it doesn't linger as a phantom "in progress" checkout.
      await admin.from("payments").update({ status: "failed" }).eq("id", pendingPayment.id);
      // Logged in full server-side (may contain Razorpay's own error description/code — useful for
      // debugging, never a secret) but never re-thrown as-is: a third-party SDK error's shape and
      // wording isn't something this app controls or has vetted as safe to show a client, unlike
      // this codebase's own AppError messages that toAppError()/errorResponse() otherwise trust.
      console.error("[payments:checkout] Razorpay order creation failed", razorpayErr);
      return NextResponse.json({ status: "error", message: "Couldn't start checkout. Please try again." }, { status: 502 });
    }

    const { error: linkError } = await admin.from("payments").update({ provider_order_id: order.id }).eq("id", pendingPayment.id);
    if (linkError) throw linkError;

    return NextResponse.json({
      status: "ok",
      orderId: order.id,
      // Amount/currency echoed back from what the ORDER was actually created with (Razorpay's own
      // response), not re-derived client-side — Checkout.js needs these to render the modal.
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayConfig.keyId(),
      planName: plan.name,
    });
  } catch (err) {
    return errorResponse(err, "api.payments.checkout");
  }
}
