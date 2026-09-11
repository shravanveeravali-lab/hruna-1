/**
 * "Submit Portfolio for Review" — moves portfolio_status to 'submitted' only; only an admin action
 * (Phase 6) can move it further to under_review/approved/rejected/revision_required
 * (designer_verifications_update_admin_only RLS enforces that independently of this route).
 * Readiness check mirrors the existing mock's own rule exactly (>= 3 items + ownership accepted).
 *
 * designer_verifications is admin-write-only by RLS — a plain .update() here is silently blocked
 * (0 rows affected, no thrown error), which is exactly how this previously shipped broken: this
 * route returned a false "ok" while writing nothing. submit_portfolio_for_review() (see its own
 * migration comment) is the narrow, self-service exception — re-verifies the same precondition
 * server-side before writing. The check below is kept too, so a not-ready caller gets this route's
 * specific, friendly message instead of the RPC's generic exception text.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const [{ data: onboarding }, { count: itemCount }] = await Promise.all([
      supabase.from("designer_onboarding").select("portfolio_ownership_accepted").eq("designer_id", ctx.designerId).single(),
      supabase.from("designer_portfolio_items").select("id", { count: "exact", head: true }).eq("designer_id", ctx.designerId),
    ]);

    if (!onboarding || (itemCount ?? 0) < 3 || !onboarding.portfolio_ownership_accepted) {
      return NextResponse.json(
        { status: "error", message: "Add at least 3 portfolio items and accept ownership before submitting." },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("submit_portfolio_for_review");
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.onboarding.submitPortfolio");
  }
}
