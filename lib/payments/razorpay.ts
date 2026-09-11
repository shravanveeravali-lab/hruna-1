import "server-only";

/**
 * Thin Razorpay wrapper (Phase 8) — the only file that imports the `razorpay` SDK or reaches out
 * to Razorpay's API. Everything else (checkout/verify/webhook routes) calls through here, never
 * the SDK directly, so there's exactly one place that knows Razorpay's request/response shapes.
 *
 * Integration model: Orders + Checkout (a one-time payment per billing period), not Razorpay's
 * Subscriptions/recurring-mandate API — see the checkout route's own comment for why. Verified
 * against Razorpay's current documented Node.js integration steps (razorpay.com/docs/payments/
 * server-integration/nodejs/integration-steps) as of this phase, not assumed from memory.
 */

import Razorpay from "razorpay";
import crypto from "node:crypto";
import { razorpayConfig } from "./config";

let client: InstanceType<typeof Razorpay> | null = null;

function getClient() {
  if (!client) {
    client = new Razorpay({ key_id: razorpayConfig.keyId(), key_secret: razorpayConfig.keySecret() });
  }
  return client;
}

export interface CreateOrderParams {
  /** Rupees (or the plan's currency's major unit) — converted to the provider's minor unit (paise) internally. */
  amount: number;
  currency: string;
  /** Razorpay requires receipt <= 40 chars. */
  receipt: string;
  notes: Record<string, string>;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const rzp = getClient();
  // Razorpay amounts are always in the smallest currency unit (paise for INR) — Math.round guards
  // against floating-point drift on values like 299.00 * 100.
  const amountInMinorUnit = Math.round(params.amount * 100);
  const order = await rzp.orders.create({
    amount: amountInMinorUnit,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
  });
  return order;
}

/** Constant-time comparison — never use `===` for secrets/signatures (timing side-channel). */
function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a Checkout success response server-side — never trust `razorpay_payment_id`/
 * `razorpay_order_id` reported by the browser without this. Formula per Razorpay's docs:
 * generated_signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret).
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", razorpayConfig.keySecret()).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

/**
 * Verifies an incoming webhook request server-side. Formula per Razorpay's docs:
 * signature = HMAC-SHA256(raw_request_body, webhook_secret). MUST be computed over the exact raw
 * request body bytes/text — never the re-serialized parsed JSON, which can differ byte-for-byte
 * (key order, whitespace) and would make a genuine webhook fail verification.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", razorpayConfig.webhookSecret()).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, signature);
}
