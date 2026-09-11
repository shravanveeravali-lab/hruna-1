/**
 * Customer-initiated account deletion. See the schema itself for why this can't be an unconditional
 * hard delete: fashion_requests.customer_id, projects.customer_id, reviews.customer_id,
 * disputes.customer_id, user_subscriptions.user_id, and payments.user_id are all deliberately
 * NOT cascading (plain REFERENCES, which defaults to NO ACTION — see each migration's own comment,
 * e.g. requests_proposals_projects.sql: "must not be hard-deletable ... RESTRICT, soft-delete via
 * suspension instead"; subscriptions_and_payments.sql: "payment records should never be silently
 * deleted by an account-deletion action"). A designer's proposals/projects/reviews, and financial
 * records, must survive even if the customer who created them is gone.
 *
 * So: a customer with any such history CANNOT be safely hard-deleted today (the database would
 * reject it with a foreign-key violation regardless), and there is currently no self-service
 * suspend/deactivate path either (customer_profiles.status is admin-only — see the
 * customer_profiles_status_admin_only trigger in supabase/migrations/20260829180013_rls.sql, which
 * only an authenticated ADMIN session can satisfy). Building that out is a larger, deliberate
 * decision, not something to invent unilaterally here.
 *
 * What THIS route does, safely, today: checks for any such history first (via ordinary RLS-scoped
 * reads — the customer already has SELECT access to their own rows, no privilege elevation needed
 * for the check). If none exists (a customer who signed up but never actually used LILIRVE), every
 * reference is either cascading or belongs solely to them, so a real, permanent delete via the
 * Admin API is safe and is performed. If any history exists, the request is refused with a clear
 * explanation, and nothing is touched — directing them to Contact Support for manual closure.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

const HAS_HISTORY_MESSAGE =
  "Your account has existing requests, projects, or other activity, so it can't be deleted automatically. Please contact support to close your account.";

export async function POST() {
  try {
    // requireCustomer() — never a client-supplied id; every check below is scoped to THIS
    // authenticated identity only.
    const ctx = await requireCustomer();
    const supabase = createClient();

    const [requests, projects, reviews, disputes, subscriptions, payments] = await Promise.all([
      supabase.from("fashion_requests").select("id", { count: "exact", head: true }).eq("customer_id", ctx.customerId),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("customer_id", ctx.customerId),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("customer_id", ctx.customerId),
      supabase.from("disputes").select("id", { count: "exact", head: true }).eq("customer_id", ctx.customerId),
      supabase.from("user_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id),
    ]);
    for (const r of [requests, projects, reviews, disputes, subscriptions, payments]) {
      if (r.error) throw r.error;
    }

    const hasHistory = [requests, projects, reviews, disputes, subscriptions, payments].some(
      (r) => (r.count ?? 0) > 0
    );
    if (hasHistory) {
      return NextResponse.json({ status: "error", message: HAS_HISTORY_MESSAGE }, { status: 409 });
    }

    // Only reached for a customer with zero linked business/financial records — every remaining
    // reference (customer_profiles, diary_entries, customer_saved_items, conversations -> messages,
    // files) cascades cleanly, confirmed against the migrations. Admin API is required here — a
    // regular session can never delete its own auth.users row through the normal client.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.account.delete");
  }
}
