/**
 * Advances a dispute's status (§12) — the workflow is exactly Open → Under Review → Resolved →
 * Closed, one step at a time, matching the existing mock's own NEXT_STEP table. Validated
 * server-side too (never trusts the client's belief about what the "next" status is), so a client
 * can't skip straight to `closed` from `open`.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { logAdminAction } from "@/lib/admin/audit";
import type { Enums } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const NEXT_STEP: Record<string, Enums<"dispute_status">> = {
  open: "under_review",
  under_review: "resolved",
  resolved: "closed",
};

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const supabase = createClient();

    const { data: dispute } = await supabase.from("disputes").select("status").eq("id", params.id).maybeSingle();
    if (!dispute) return NextResponse.json({ status: "error", message: "Dispute not found." }, { status: 404 });

    const next = NEXT_STEP[dispute.status];
    if (!next) {
      return NextResponse.json({ status: "error", message: "This dispute is already closed." }, { status: 400 });
    }

    const { error } = await supabase.from("disputes").update({ status: next }).eq("id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "platform", subjectId: params.id, action: `Dispute marked ${next.replace(/_/g, " ")}` });
    return NextResponse.json({ status: "ok", newStatus: next });
  } catch (err) {
    return errorResponse(err, "api.admin.disputes.status");
  }
}
