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
      .update({ portfolio_status: "revision_required", portfolio_review_note: reason })
      .eq("designer_id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "designer", subjectId: params.id, action: "Requested portfolio revision", reason });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.designers.requestPortfolioRevision");
  }
}
