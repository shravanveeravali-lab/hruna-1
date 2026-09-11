/**
 * PaymentService — the single seam where a real payment provider
 * (Razorpay, Stripe, etc.) gets connected later.
 *
 * ⚠️ SECURITY NOTE — READ BEFORE CONNECTING A REAL PROVIDER
 * This is a frontend-only prototype: there is no real backend, database, or
 * server session here, so nothing in this file is actually secure yet.
 * Before going live with real payments, this entire module must move to a
 * server-side API route / backend service, because:
 *   - Secret API keys (Razorpay key secret, Stripe secret key) must live in
 *     server-side environment variables (e.g. process.env.RAZORPAY_KEY_SECRET)
 *     and must NEVER be imported into client-bundled code like this file
 *     currently is.
 *   - Payment success must be verified server-side (signature verification /
 *     webhook confirmation), never trusted from a frontend redirect.
 *   - Card numbers, CVV, and other card data must never touch this
 *     application's storage at all — the provider's hosted checkout /
 *     Elements / Checkout.js handles that entirely.
 *
 * Until that migration happens, every method below is a safe, storage-only
 * mock: it updates the in-memory subscription/payment records the same way
 * a real webhook handler eventually would, but never contacts a real
 * payment gateway and never handles card data.
 */

import {
  getPaymentSettings,
  getSubscriptionPlanByRole,
  createUserSubscription,
  recordPayment,
  cancelUserSubscription,
  getUserSubscription,
} from "./store";
import type { SubscriberRole } from "@/types";

export interface CheckoutResult {
  ok: boolean;
  reason?: string;
  subscriptionId?: string;
}

export const PaymentService = {
  /**
   * Starts a checkout for the given user/role.
   * REAL PROVIDER TODO: call the provider's order/checkout-session API
   * server-side, return a redirect URL or client secret to the frontend,
   * and do NOT create the subscription here — only after verifyPayment /
   * handleWebhook confirms the charge succeeded.
   */
  createCheckout(userId: string, role: SubscriberRole): CheckoutResult {
    const settings = getPaymentSettings();
    if (!settings.paymentSystemEnabled) {
      return { ok: false, reason: "Payment system is currently disabled." };
    }
    const plan = getSubscriptionPlanByRole(role);
    if (!plan || !plan.isActive) {
      return { ok: false, reason: "No active plan is configured for this role." };
    }

    // MOCK ONLY: no real gateway is connected, so we simulate an instantly
    // successful checkout so the admin can test enforcement end-to-end in
    // this prototype. A real integration replaces this block with a
    // redirect to the provider's hosted checkout and waits for a webhook.
    const subscription = createUserSubscription(userId, role, plan.id);
    recordPayment({
      userId,
      subscriptionId: subscription.id,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: "succeeded",
      paymentProvider: "mock",
      transactionId: `mock_txn_${Date.now()}`,
      paidAt: new Date().toISOString(),
    });
    return { ok: true, subscriptionId: subscription.id };
  },

  /**
   * REAL PROVIDER TODO: verify the payment signature/status directly with
   * the provider's API (never trust a frontend "success" redirect alone).
   */
  verifyPayment(userId: string): boolean {
    const sub = getUserSubscription(userId);
    return sub?.status === "active";
  },

  /**
   * REAL PROVIDER TODO: call the provider's recurring-subscription API so
   * future renewals are billed automatically; store the provider's
   * subscription id on UserSubscription.paymentProviderSubscriptionId.
   */
  createSubscription(userId: string, role: SubscriberRole): CheckoutResult {
    return this.createCheckout(userId, role);
  },

  /**
   * REAL PROVIDER TODO: call the provider's cancel-subscription API so no
   * further renewals are billed, then mirror the result here.
   */
  cancelSubscription(userId: string): void {
    cancelUserSubscription(userId);
  },

  /**
   * REAL PROVIDER TODO: this is where an incoming webhook (payment.captured,
   * subscription.charged, subscription.cancelled, etc.) gets verified via
   * the provider's signing secret and translated into recordPayment /
   * createUserSubscription / cancelUserSubscription calls. Kept as a stub
   * here since there is no server endpoint to receive real webhooks yet.
   */
  handleWebhook(_payload: unknown): void {
    // Intentionally a no-op until a real provider + server endpoint exists.
  },
};
