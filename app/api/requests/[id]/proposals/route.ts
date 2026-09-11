/**
 * Proposals received for one request — visible to the request's own customer (or admin, or the
 * proposing designer), per proposals_select RLS. A customer who doesn't own this request simply
 * gets an empty list back, the same as any other RLS-scoped query — this route never widens that.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapProposal, getDesignerSummaries } from "@/lib/customer/data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("request_id", params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const designers = await getDesignerSummaries(supabase, (data ?? []).map((p) => p.designer_id));
    const proposals = (data ?? []).map((p) => mapProposal(p, designers.get(p.designer_id)));

    return NextResponse.json({ status: "ok", proposals });
  } catch (err) {
    return errorResponse(err, "api.requests.proposals");
  }
}
