/**
 * Full customer detail bundle for the admin customer-review page (§9/§22).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = createClient();

    const { data: customer, error } = await supabase.from("customer_profiles").select("*, users(email, display_name)").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!customer) {
      return NextResponse.json({ status: "error", message: "Customer not found." }, { status: 404 });
    }
    const user = (customer as unknown as { users: { email: string | null; display_name: string | null } | null }).users;

    const [{ data: projects }, { data: subscription }, { count: diaryCount }, { count: savedCount }, { data: auditLog }] = await Promise.all([
      supabase.from("projects").select("id, request_id, designer_id, stage, status, created_at").eq("customer_id", params.id),
      supabase.from("user_subscriptions").select("*").eq("user_id", customer.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("diary_entries").select("id", { count: "exact", head: true }).eq("customer_id", params.id),
      supabase.from("customer_saved_items").select("id", { count: "exact", head: true }).eq("customer_id", params.id),
      supabase.from("admin_audit_log").select("*").eq("subject_type", "customer").eq("subject_id", params.id).order("created_at", { ascending: false }),
    ]);

    const requestIds = (projects ?? []).map((p) => p.request_id);
    const { data: requests } = requestIds.length
      ? await supabase.from("fashion_requests").select("id, title").in("id", requestIds)
      : { data: [] as { id: string; title: string }[] };
    const titleByRequestId = new Map((requests ?? []).map((r) => [r.id, r.title]));

    let plan = null;
    if (subscription?.plan_id) {
      const { data } = await supabase.from("subscription_plans").select("*").eq("id", subscription.plan_id).maybeSingle();
      plan = data;
    }

    const adminIds = [...new Set((auditLog ?? []).map((a) => a.admin_id))];
    const { data: adminUsers } = adminIds.length
      ? await supabase.from("users").select("id, display_name, email").in("id", adminIds)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
    const adminNameById = new Map((adminUsers ?? []).map((u) => [u.id, u.display_name || u.email || "Admin"]));

    return NextResponse.json({
      status: "ok",
      customer: {
        id: customer.id,
        userId: customer.user_id,
        name: customer.name,
        email: user?.email ?? "",
        city: customer.city ?? "",
        phone: customer.phone ?? "",
        status: customer.status,
        createdAt: customer.created_at,
      },
      projects: (projects ?? []).map((p) => ({ id: p.id, title: titleByRequestId.get(p.request_id) ?? "Untitled project", stage: p.stage, status: p.status })),
      subscription: subscription
        ? { status: subscription.status, renewalDate: subscription.renewal_date ?? undefined, planName: plan?.name ?? "" }
        : null,
      diaryCount: diaryCount ?? 0,
      savedCount: savedCount ?? 0,
      auditLog: (auditLog ?? []).map((a) => ({
        id: a.id,
        action: a.action,
        reason: a.reason ?? undefined,
        adminName: adminNameById.get(a.admin_id) ?? "Admin",
        timestamp: a.created_at,
      })),
    });
  } catch (err) {
    return errorResponse(err, "api.admin.customers.detail");
  }
}
