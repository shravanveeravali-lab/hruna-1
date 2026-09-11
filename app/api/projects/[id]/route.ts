/**
 * Single project detail (the Project Workspace's backing data — both the customer's and the
 * designer's, §17/§18). Visible to either participant or admin per projects_select RLS — this
 * route just queries by id and trusts that policy. Embeds BOTH the designer summary (for the
 * customer-side workspace) and the customer summary (for the designer-side workspace) in one
 * response, since either side is authorized to see the other party's summary for THIS shared
 * project — one endpoint, reused by both `(app)/projects/[id]` and `(designer)/designer/projects/[id]`.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapProject, resolveRequestImages, getDesignerSummaries, getCustomerSummaries } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const supabase = createClient();

    const { data: project, error } = await supabase.from("projects").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!project) {
      return NextResponse.json({ status: "error", message: "Project not found." }, { status: 404 });
    }

    const [{ data: request }, { data: proposal }] = await Promise.all([
      supabase.from("fashion_requests").select("*").eq("id", project.request_id).single(),
      supabase.from("proposals").select("*").eq("id", project.proposal_id).single(),
    ]);
    if (!request || !proposal) {
      // Shouldn't happen (both FKs are NOT NULL), but keeps this route's own types honest rather
      // than asserting non-null past a real API boundary.
      throw new Error("Project is missing its request or proposal.");
    }
    const images = await resolveRequestImages(supabase, project.request_id);
    const [designers, customers, { data: existingReview }] = await Promise.all([
      getDesignerSummaries(supabase, [project.designer_id]),
      getCustomerSummaries(supabase, [project.customer_id]),
      // reviews_select_public (RLS) makes this readable by anyone — used here only to tell the
      // customer-side workspace whether to show the "Leave a Review" form (one review per project,
      // enforced by the reviews table's own unique(project_id) constraint either way).
      supabase.from("reviews").select("id").eq("project_id", params.id).maybeSingle(),
    ]);

    return NextResponse.json({
      status: "ok",
      project: {
        ...mapProject(project, request, proposal, images),
        designer: designers.get(project.designer_id),
        customer: customers.get(project.customer_id),
        hasReview: !!existingReview,
      },
    });
  } catch (err) {
    return errorResponse(err, "api.projects.detail");
  }
}
