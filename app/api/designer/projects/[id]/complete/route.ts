/**
 * Designer-side half of the two-sided completion workflow (§24) — Phase 4 deliberately left this
 * whole workflow stubbed since no real path could reach `awaiting_confirmation` yet. A designer
 * can only ever move a project to `awaiting_confirmation`, never directly to `completed` — only
 * the customer's own confirmation (app/api/projects/[id]/confirm-completion) can do that. Scoped
 * to `active` projects only via the WHERE clause, so this can't be called twice or on a project
 * that's already awaiting confirmation/completed/cancelled.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireApprovedDesigner();
    const supabase = createClient();

    const { data: updated, error } = await supabase
      .from("projects")
      .update({ stage: "Completed", progress_percent: 100, status: "awaiting_confirmation" })
      .eq("id", params.id)
      .eq("designer_id", ctx.designerId)
      .eq("status", "active")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "This project isn't in a state that can be marked completed." },
        { status: 400 }
      );
    }

    return NextResponse.json({ status: "ok", project: updated });
  } catch (err) {
    return errorResponse(err, "api.designer.projects.complete");
  }
}
