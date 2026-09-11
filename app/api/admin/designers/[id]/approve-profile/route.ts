/**
 * Approves the overall profile (§5) — also reused as "Reinstate" for a suspended designer on the
 * Users page, since it's the exact same transition with the exact same guard the original mock
 * used for both actions. Requires identity_status='verified' AND portfolio_status='approved',
 * checked server-side (never trusting a client's belief that both are already true).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const supabase = createClient();

    const { data: verification } = await supabase
      .from("designer_verifications")
      .select("identity_status, portfolio_status")
      .eq("designer_id", params.id)
      .maybeSingle();
    if (!verification || verification.identity_status !== "verified" || verification.portfolio_status !== "approved") {
      return NextResponse.json(
        { status: "error", message: "Identity must be verified and portfolio approved before the profile can be approved." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("designer_verifications")
      .update({ overall_status: "approved", reviewed_at: new Date().toISOString(), profile_review_note: null })
      .eq("designer_id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "designer", subjectId: params.id, action: "Approved profile — designer is now verified" });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.designers.approveProfile");
  }
}
