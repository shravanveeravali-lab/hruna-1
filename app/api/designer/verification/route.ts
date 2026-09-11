/**
 * Designer-side verification status display (§4). Read-only — there is no PATCH/POST here at all,
 * on purpose: designer_verifications_update_admin_only RLS means only an admin session can ever
 * change this row, and this route doesn't create a second, weaker path around that. A designer can
 * see their own NOT_SUBMITTED/PENDING/APPROVED/REJECTED/SUSPENDED status; they can never set it.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapVerification } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const { data: verification, error } = await supabase
      .from("designer_verifications")
      .select("*")
      .eq("designer_id", ctx.designerId)
      .maybeSingle();
    if (error) throw error;
    if (!verification) {
      return NextResponse.json({ status: "error", message: "Verification record not found." }, { status: 404 });
    }

    const { count: completedProjectCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("designer_id", ctx.designerId)
      .eq("status", "completed");

    const { data: designer } = await supabase.from("designer_profiles").select("rating").eq("id", ctx.designerId).single();

    const isTrustedProfessional =
      verification.overall_status === "approved" &&
      (completedProjectCount ?? 0) >= 3 &&
      Number(designer?.rating ?? 0) >= 4.5;

    return NextResponse.json({
      status: "ok",
      verification: mapVerification(verification),
      isTrustedProfessional,
      completedProjectCount: completedProjectCount ?? 0,
    });
  } catch (err) {
    return errorResponse(err, "api.designer.verification");
  }
}
