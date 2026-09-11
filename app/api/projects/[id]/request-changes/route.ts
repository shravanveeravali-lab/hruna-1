/**
 * "Not yet / Request Changes" — the customer's other option when a project is
 * `awaiting_confirmation` (§24). Reverts to `active` so the designer can keep working; mirrors the
 * existing mock's own revert-to-"Final Alterations" behavior when that stage exists on the
 * project, falling back to the project's current stage otherwise (there's no dedicated "changes
 * requested" stage in project_stage — reusing the existing stage/status architecture rather than
 * inventing a new column, per §23).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, stage, stages, status")
      .eq("id", params.id)
      .eq("customer_id", ctx.customerId)
      .eq("status", "awaiting_confirmation")
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!project) {
      return NextResponse.json(
        { status: "error", message: "This project isn't awaiting your confirmation." },
        { status: 400 }
      );
    }

    const revertStage = project.stages.includes("Final Alterations") ? "Final Alterations" : project.stage;
    const stageIndex = project.stages.indexOf(revertStage);
    const progressPercent = stageIndex >= 0 ? Math.round(((stageIndex + 1) / project.stages.length) * 100) : undefined;

    const { data: updated, error } = await supabase
      .from("projects")
      .update({
        status: "active",
        stage: revertStage,
        ...(progressPercent !== undefined ? { progress_percent: progressPercent } : {}),
        changes_requested_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ status: "ok", project: updated });
  } catch (err) {
    return errorResponse(err, "api.projects.requestChanges");
  }
}
