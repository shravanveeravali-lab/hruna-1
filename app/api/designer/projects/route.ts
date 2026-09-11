/**
 * Designer's own projects — list (§16). Mirrors app/api/projects/route.ts's customer-side list
 * exactly, scoped by designer_id instead, embedding a customer summary instead of a designer one.
 * Every project here exists because a customer accepted this designer's proposal
 * (public.accept_proposal(), Phase 4) — never a row created directly by this route.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapProject, resolveRequestImages, getCustomerSummaries } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("designer_id", ctx.designerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!projects || projects.length === 0) {
      return NextResponse.json({ status: "ok", projects: [] });
    }

    const requestIds = projects.map((p) => p.request_id);
    const proposalIds = projects.map((p) => p.proposal_id);
    const [{ data: requests }, { data: proposals }] = await Promise.all([
      supabase.from("fashion_requests").select("*").in("id", requestIds),
      supabase.from("proposals").select("*").in("id", proposalIds),
    ]);
    const requestById = new Map((requests ?? []).map((r) => [r.id, r]));
    const proposalById = new Map((proposals ?? []).map((p) => [p.id, p]));
    const customers = await getCustomerSummaries(supabase, projects.map((p) => p.customer_id));

    const result = await Promise.all(
      projects.map(async (project) => {
        const request = requestById.get(project.request_id);
        const proposal = proposalById.get(project.proposal_id);
        if (!request || !proposal) return null;
        const images = await resolveRequestImages(supabase, request.id);
        return { ...mapProject(project, request, proposal, images), customer: customers.get(project.customer_id) };
      })
    );

    return NextResponse.json({ status: "ok", projects: result.filter(Boolean) });
  } catch (err) {
    return errorResponse(err, "api.designer.projects.list");
  }
}
