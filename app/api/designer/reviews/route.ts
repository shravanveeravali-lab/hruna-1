/**
 * Designer's own reviews — VIEW only (§34). No write handler exists here at all: a designer can
 * never create/edit/delete a review or touch rating/review_count — those stay exclusively the
 * customer-authored, trigger-derived pipeline built in Phase 4 (reviews_select_public RLS is the
 * only thing gating read access, and it's already public — this route doesn't widen or narrow
 * that, it just adds the project-title context the existing UI displays alongside each review).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { getCustomerSummaries } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("designer_id", ctx.designerId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const projectIds = (reviews ?? []).map((r) => r.project_id);
    const { data: projects } = projectIds.length
      ? await supabase.from("projects").select("id, request_id").in("id", projectIds)
      : { data: [] as { id: string; request_id: string }[] };
    const requestIds = (projects ?? []).map((p) => p.request_id);
    const { data: requests } = requestIds.length
      ? await supabase.from("fashion_requests").select("id, title").in("id", requestIds)
      : { data: [] as { id: string; title: string }[] };
    const titleByRequestId = new Map((requests ?? []).map((r) => [r.id, r.title]));
    const requestIdByProjectId = new Map((projects ?? []).map((p) => [p.id, p.request_id]));

    const customers = await getCustomerSummaries(supabase, (reviews ?? []).map((r) => r.customer_id));

    const result = (reviews ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectTitle: titleByRequestId.get(requestIdByProjectId.get(r.project_id) ?? "") ?? "",
      designerId: r.designer_id,
      customerId: r.customer_id,
      customer: customers.get(r.customer_id),
      rating: r.rating,
      text: r.review_text,
      date: r.created_at,
    }));

    const average = result.length ? result.reduce((sum, r) => sum + r.rating, 0) / result.length : 0;

    return NextResponse.json({ status: "ok", reviews: result, average });
  } catch (err) {
    return errorResponse(err, "api.designer.reviews.list");
  }
}
