/**
 * Suspends a designer (§6) — the ONLY designer-status system in this schema is
 * designer_verifications.overall_status (§6 explicitly warns against a duplicate one); suspension
 * is just that same enum's 'suspended' value. requireApprovedDesigner() elsewhere (Phase 5)
 * already re-checks overall_status==='approved' on every approved-designer-only action, so a
 * suspended designer loses that access immediately — there is nothing else to "turn off".
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ status: "error", message: "A reason is required." }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase
      .from("designer_verifications")
      .update({ overall_status: "suspended", profile_review_note: reason, reviewed_at: new Date().toISOString() })
      .eq("designer_id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "designer", subjectId: params.id, action: "Suspended profile", reason });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.designers.suspend");
  }
}
