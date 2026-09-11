/**
 * Suspends a customer (§9) — customer_profiles.status, the only customer-account-status column in
 * this schema. enforce_customer_status_admin_only (Phase 1 trigger) independently requires
 * is_admin() for this exact column regardless of what this route does, so this is defense in
 * depth, not the only gate. A suspended customer isn't currently re-checked by any RLS policy
 * (matching Phase 1: suspension exists as a real status but no policy conditions access on it
 * yet) — recorded here as-is rather than silently expanding scope with a new enforcement point
 * this phase wasn't asked to add.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "Suspended by admin.";

    const supabase = createClient();
    const { error } = await supabase.from("customer_profiles").update({ status: "suspended" }).eq("id", params.id);
    if (error) throw error;

    await logAdminAction(supabase, ctx.user.id, { subjectType: "customer", subjectId: params.id, action: "Suspended customer account", reason });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.customers.suspend");
  }
}
