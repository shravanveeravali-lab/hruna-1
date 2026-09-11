/**
 * User Management (§8) — ALL real customers and designers, not the single hardcoded demo account
 * the mock UI showed (its own text acknowledged this: "a production build would list every
 * registered customer here"). users_select_self_or_admin RLS lets an admin session read every row
 * in `users`/`customer_profiles`/`designer_profiles` directly — no service-role needed.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const [{ data: customers, error: customersError }, { data: designers, error: designersError }, { data: verifications }, { data: subs }] =
      await Promise.all([
        supabase.from("customer_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("designer_profiles").select("*, users(display_name)").order("created_at", { ascending: false }),
        supabase.from("designer_verifications").select("designer_id, overall_status"),
        supabase.from("user_subscriptions").select("user_id, status").eq("status", "active"),
      ]);
    if (customersError) throw customersError;
    if (designersError) throw designersError;

    const statusByDesignerId = new Map((verifications ?? []).map((v) => [v.designer_id, v.overall_status]));
    const activeSubUserIds = new Set((subs ?? []).map((s) => s.user_id));

    const customerRows = (customers ?? []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      city: c.city ?? "",
      phone: c.phone ?? "",
      status: c.status,
      createdAt: c.created_at,
      hasActiveSubscription: activeSubUserIds.has(c.user_id),
    }));

    const designerRows = (designers ?? []).map((d) => ({
      id: d.id,
      userId: d.user_id,
      name: (d as unknown as { users: { display_name: string | null } | null }).users?.display_name || d.studio_name || "Unnamed designer",
      studioName: d.studio_name,
      city: d.city ?? "",
      rating: Number(d.rating),
      overallStatus: statusByDesignerId.get(d.id) ?? "not_submitted",
      createdAt: d.created_at,
      hasActiveSubscription: activeSubUserIds.has(d.user_id),
    }));

    return NextResponse.json({ status: "ok", customers: customerRows, designers: designerRows });
  } catch (err) {
    return errorResponse(err, "api.admin.users.list");
  }
}
