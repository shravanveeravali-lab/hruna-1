/**
 * Designer Verification Queue (§4) — every designer_verifications row + enough designer/onboarding
 * context to render the existing queue list, filterable client-side exactly like the current mock
 * (small enough dataset; §21 doesn't require server-side filtering here since nothing about
 * correctness depends on it — unlike, say, the request feed's authorization-sensitive filtering).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapVerification, getDesignerSummaries } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const { data: verifications, error } = await supabase
      .from("designer_verifications")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const designerIds = (verifications ?? []).map((v) => v.designer_id);
    const [designers, { data: onboardingRows }] = await Promise.all([
      getDesignerSummaries(supabase, designerIds),
      designerIds.length
        ? supabase.from("designer_onboarding").select("designer_id, roles").in("designer_id", designerIds)
        : Promise.resolve({ data: [] as { designer_id: string; roles: string[] }[] }),
    ]);
    const rolesByDesignerId = new Map((onboardingRows ?? []).map((o) => [o.designer_id, o.roles]));

    const rows = (verifications ?? []).map((v) => ({
      verification: mapVerification(v),
      designer: designers.get(v.designer_id),
      roles: rolesByDesignerId.get(v.designer_id) ?? [],
    }));

    return NextResponse.json({ status: "ok", rows });
  } catch (err) {
    return errorResponse(err, "api.admin.verification.list");
  }
}
