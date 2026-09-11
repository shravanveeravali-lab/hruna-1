/**
 * Verifies a Razorpay Checkout success response server-side (Phase 8) and, only if genuinely
 * valid, activates the subscription. The browser's report of "payment succeeded" is NEVER trusted
 * on its own — this route recomputes the HMAC signature itself (lib/payments/razorpay.ts) and
 * only proceeds if it matches. This is the client-triggered half of activation; the webhook
 * (app/api/payments/webhook/route.ts) is the other, authoritative half — both converge on the
 * same lib/payments/activate.ts so a browser that never calls back (closed mid-flow) still ends up
 * with a real subscription once Razorpay's webhook arrives.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { activateSubscriptionForPayment } from "@/lib/payments/activate";
import { mapUserSubscription } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    const body = await request.json().catch(() => null);
    const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ status: "error", message: "Missing payment verification fields." }, { status: 400 });
    }

    const supabase = createClient();
    // Ownership check via the AUTHENTICATED caller's own client — RLS (payments_select: user_id =
    // auth.uid() OR is_admin()) means this simply returns nothing if orderId belongs to someone
    // else, without this route needing to hand-roll that check.
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("provider_order_id", orderId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!payment) {
      return NextResponse.json({ status: "error", message: "Payment record not found." }, { status: 404 });
    }

    if (payment.status === "succeeded") {
      // Idempotent — the webhook may have already processed this one first.
      const { data: sub } = payment.subscription_id
        ? await supabase.from("user_subscriptions").select("*").eq("id", payment.subscription_id).maybeSingle()
        : { data: null };
      return NextResponse.json({ status: "ok", subscription: sub ? mapUserSubscription(sub) : null });
    }

    const valid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) {
      // A mismatched signature is a strong tamper/fraud signal — never activate on it, and record
      // the row as failed so it doesn't linger as "pending" indefinitely.
      const admin = createAdminClient();
      await admin.from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "pending");
      return NextResponse.json({ status: "error", message: "Payment verification failed." }, { status: 400 });
    }

    const result = await activateSubscriptionForPayment(payment.id, paymentId);
    return NextResponse.json({ status: "ok", subscription: result.subscription ? mapUserSubscription(result.subscription) : null });
  } catch (err) {
    return errorResponse(err, "api.payments.verify");
  }
}
