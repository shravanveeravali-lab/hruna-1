/**
 * Customer's own projects — list. Every project is assembled by joining its request + accepted
 * proposal (see lib/customer/data.ts's mapProject) rather than reading any duplicated content off
 * the projects table itself, which only ever stores the reference ids.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapProject, resolveRequestImages, getDesignerSummaries } from "@/lib/customer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("customer_id", ctx.customerId)
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
    const designers = await getDesignerSummaries(supabase, projects.map((p) => p.designer_id));

    const result = await Promise.all(
      projects.map(async (project) => {
        const request = requestById.get(project.request_id);
        const proposal = proposalById.get(project.proposal_id);
        if (!request || !proposal) return null;
        const images = await resolveRequestImages(supabase, request.id);
        return { ...mapProject(project, request, proposal, images), designer: designers.get(project.designer_id) };
      })
    );

    return NextResponse.json({ status: "ok", projects: result.filter(Boolean) });
  } catch (err) {
    return errorResponse(err, "api.projects.list");
  }
}
