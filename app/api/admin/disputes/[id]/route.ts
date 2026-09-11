import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapDispute, mapDisputeNote, getCustomerSummaries, getDesignerSummaries } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = createClient();

    const { data: dispute, error } = await supabase.from("disputes").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!dispute) return NextResponse.json({ status: "error", message: "Dispute not found." }, { status: 404 });

    const [{ data: notes }, customers, designers] = await Promise.all([
      supabase.from("dispute_notes").select("*").eq("dispute_id", params.id).order("created_at", { ascending: true }),
      getCustomerSummaries(supabase, [dispute.customer_id]),
      getDesignerSummaries(supabase, [dispute.designer_id]),
    ]);

    let projectTitle: string | undefined;
    if (dispute.project_id) {
      const { data: project } = await supabase.from("projects").select("request_id").eq("id", dispute.project_id).maybeSingle();
      if (project) {
        const { data: request } = await supabase.from("fashion_requests").select("title").eq("id", project.request_id).maybeSingle();
        projectTitle = request?.title;
      }
    }

    const adminIds = [...new Set((notes ?? []).map((n) => n.admin_id))];
    const { data: adminUsers } = adminIds.length
      ? await supabase.from("users").select("id, display_name, email").in("id", adminIds)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
    const adminNameById = new Map((adminUsers ?? []).map((u) => [u.id, u.display_name || u.email || "Admin"]));

    return NextResponse.json({
      status: "ok",
      dispute: {
        ...mapDispute(dispute),
        customer: customers.get(dispute.customer_id),
        designer: designers.get(dispute.designer_id),
        projectTitle,
      },
      notes: (notes ?? []).map((n) => mapDisputeNote(n, adminNameById.get(n.admin_id) ?? "Admin")),
    });
  } catch (err) {
    return errorResponse(err, "api.admin.disputes.detail");
  }
}
