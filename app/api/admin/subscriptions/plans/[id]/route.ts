/**
 * Subscription plan editing (§15) — subscription_plans_admin_write RLS is admin-only.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { logAdminAction } from "@/lib/admin/audit";
import { mapSubscriptionPlan } from "@/lib/admin/data";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"subscription_plans"> = { updated_at: new Date().toISOString() };
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.price === "number" && body.price >= 0) patch.price = body.price;
    if (typeof body?.currency === "string" && body.currency) patch.currency = body.currency;
    if (typeof body?.description === "string") patch.description = body.description;
    if (Array.isArray(body?.features)) patch.features = body.features;
    if (typeof body?.isActive === "boolean") patch.is_active = body.isActive;

    const supabase = createClient();
    const { data, error } = await supabase.from("subscription_plans").update(patch).eq("id", params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "error", message: "Plan not found." }, { status: 404 });

    await logAdminAction(supabase, ctx.user.id, { subjectType: "platform", subjectId: params.id, action: `Updated subscription plan "${data.name}"` });
    return NextResponse.json({ status: "ok", plan: mapSubscriptionPlan(data) });
  } catch (err) {
    return errorResponse(err, "api.admin.subscriptions.plans.update");
  }
}
