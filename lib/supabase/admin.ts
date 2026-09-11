import "server-only";

/**
 * Service-role Supabase client — BYPASSES Row Level Security entirely. This is the one Supabase
 * client in this project that can read/write any row regardless of ownership.
 *
 * The `server-only` import above is not a comment — it's an enforced build-time guard: if any
 * "use client" component (or anything imported by one) ever imports this file, the Next.js build
 * fails immediately with an explicit error, instead of silently shipping this module (and the
 * service-role key it reads) toward the browser bundle.
 *
 * ONLY use this for genuinely privileged, trusted server-side operations that must legitimately
 * see across every user's data — e.g. a future admin API route, a webhook handler, a scheduled
 * job. Every ordinary request — including ones made by an admin user browsing /admin — should go
 * through lib/supabase/server.ts instead, so RLS still applies and `is_admin`-gated policies (see
 * the RLS migration) are what's actually granting the access, not a blanket bypass.
 *
 * In active use: Phase 6's designer-portfolio-image signing (lib/admin/data.ts), and Phase 8's
 * Razorpay checkout/verify/cancel/webhook routes (app/api/payments/*) — payments/user_subscriptions
 * RLS is admin-write-only by design (see 20260829180013_rls.sql's comment on those policies), so
 * the real subscribe/charge flow legitimately routes through here rather than a raw client insert.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import type { Database } from "./types";

export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseConfig.url(), supabaseConfig.serviceRoleKey(), {
    auth: {
      // This client never represents a signed-in browser session — it authenticates as the
      // service role itself, so there's no user session to persist or auto-refresh.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
