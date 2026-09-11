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

    const { error } = await supabase
      .from("designer_verifications")
      .update({ identity_status: "verified", identity_failure_reason: null })
      .eq("designer_id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "designer", subjectId: params.id, action: "Verified identity" });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.designers.verifyIdentity");
  }
}
