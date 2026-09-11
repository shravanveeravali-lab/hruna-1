/**
 * Razorpay webhook (Phase 8) — the authoritative half of payment activation. No Supabase session
 * exists here at all (Razorpay's servers call this directly); trust comes ENTIRELY from verifying
 * `x-razorpay-signature` against the raw request body using the webhook secret configured in the
 * Razorpay Dashboard (lib/payments/razorpay.ts's verifyWebhookSignature). Nothing in the payload
 * is trusted before that check passes.
 *
 * Only two events are handled, because they're the only two this project's subscription lifecycle
 * (Orders + Checkout, one payment per billing period — see the checkout route's comment) actually
 * needs:
 *   - payment.captured — the charge succeeded. Activates the subscription (via the SAME
 *     lib/payments/activate.ts the client-triggered /verify route uses), covering the case where
 *     the browser never called back (closed mid-flow, network drop after paying).
 *   - payment.failed — the charge failed. Marks the pending payments row failed so it doesn't
 *     linger as "in progress" forever.
 * Every other event type is acknowledged with 200 and otherwise ignored — Razorpay retries on
 * anything other than 2xx, and there's nothing else in this project's data model for those events
 * to update.
 *
 * Idempotent by construction: activateSubscriptionForPayment's `.eq("status","pending")` guard
 * means a duplicate delivery of the same event (Razorpay explicitly does not guarantee
 * exactly-once delivery) is a safe no-op, never a duplicate subscription/payment record.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { activateSubscriptionForPayment } from "@/lib/payments/activate";

export const dynamic = "force-dynamic";

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
}

export async function POST(request: Request) {
  // Raw text, not request.json() — the signature is computed over the exact raw body bytes; a
  // parsed-then-reserialized body can differ (key order/whitespace) and would break verification
  // for genuine, unmodified webhook deliveries.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    // Deliberately generic — never echoes back what was received, never logs the signature/secret.
    return NextResponse.json({ status: "error", message: "Invalid webhook signature." }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "error", message: "Malformed webhook payload." }, { status: 400 });
  }

  const eventType = event.event;
  const entity = event.payload?.payment?.entity;

  try {
    if (eventType === "payment.captured" && entity?.order_id && entity.id) {
      const admin = createAdminClient();
      const { data: payment } = await admin.from("payments").select("id, amount, currency").eq("provider_order_id", entity.order_id).maybeSingle();
      if (payment) {
        // Defense in depth — the amount actually captured must match what checkout created the
        // order for. A mismatch never happens for a genuine, unmodified Razorpay event; it's
        // cheap insurance against a malformed/forged payload structurally passing signature
        // verification some other way.
        const expectedMinorUnit = Math.round(Number(payment.amount) * 100);
        if (entity.amount === expectedMinorUnit) {
          await activateSubscriptionForPayment(payment.id, entity.id);
        }
      }
      // No matching pending payment row — most likely already activated via /verify moments
      // earlier, or an order this project didn't create. Either way, 200: nothing to retry.
      return NextResponse.json({ status: "ok" });
    }

    if (eventType === "payment.failed" && entity?.order_id) {
      const admin = createAdminClient();
      const { data: payment } = await admin.from("payments").select("id").eq("provider_order_id", entity.order_id).maybeSingle();
      if (payment) {
        await admin.from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "pending");
      }
      return NextResponse.json({ status: "ok" });
    }

    // Unhandled event type — acknowledged, not processed.
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    // Never leak internals to Razorpay's retry logs; 500 tells Razorpay to retry, which is the
    // correct behavior for a transient failure on our side (e.g. a momentary DB error).
    console.error("[payments:webhook]", err);
    return NextResponse.json({ status: "error", message: "Webhook processing failed." }, { status: 500 });
  }
}
