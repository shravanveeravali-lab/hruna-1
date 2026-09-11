import "server-only";

/**
 * Central place every Razorpay-touching module reads its credentials from — mirrors
 * lib/supabase/config.ts's pattern exactly. Lazy (a function per value, called only when actually
 * needed) so importing this file doesn't itself throw in an environment where payments are
 * genuinely disabled and Razorpay credentials were never configured — only routes that actually
 * try to create/verify a payment or handle a webhook will ever call these.
 *
 * `server-only` is an enforced build-time guard, same as lib/supabase/admin.ts: if any "use
 * client" component (or anything it imports) ever pulls this file in, the build fails immediately
 * instead of silently risking these values reaching the browser bundle.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill ` +
        `in your Razorpay TEST-mode credentials (see .env.example's comments).`
    );
  }
  return value;
}

export const razorpayConfig = {
  // Not a secret by Razorpay's own design (it's meant to be passed to Checkout.js in the
  // browser) — kept server-only anyway and only ever handed to the client inside a JSON API
  // response body (never baked into the client bundle via NEXT_PUBLIC_), so rotating it never
  // requires a rebuild/redeploy.
  keyId: () => requireEnv("RAZORPAY_KEY_ID"),
  // Genuinely secret — used only to call the Razorpay Orders API and to compute the payment
  // signature HMAC. Never returned from any API response, never logged.
  keySecret: () => requireEnv("RAZORPAY_KEY_SECRET"),
  // Genuinely secret — the shared secret configured in the Razorpay Dashboard's webhook settings,
  // used only to verify the `x-razorpay-signature` header on incoming webhook requests.
  webhookSecret: () => requireEnv("RAZORPAY_WEBHOOK_SECRET"),
};
