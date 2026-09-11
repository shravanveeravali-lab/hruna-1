/**
 * Reports & Disputes (§12) — disputes_admin_all RLS is admin-only for both read AND write, so
 * there is no risk of a customer/designer reaching this data even by accident: the table simply
 * returns nothing to anyone else. No dispute-creation endpoint exists here (or anywhere in the
 * existing frontend) — matches the current UI exactly; disputes exist only as admin-managed
 * records this phase.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapDispute, getCustomerSummaries, getDesignerSummaries } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const { data, error } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const [customers, designers] = await Promise.all([
      getCustomerSummaries(supabase, (data ?? []).map((d) => d.customer_id)),
      getDesignerSummaries(supabase, (data ?? []).map((d) => d.designer_id)),
    ]);

    const disputes = (data ?? []).map((d) => ({
      ...mapDispute(d),
      customer: customers.get(d.customer_id),
      designer: designers.get(d.designer_id),
    }));

    return NextResponse.json({ status: "ok", disputes });
  } catch (err) {
    return errorResponse(err, "api.admin.disputes.list");
  }
}
