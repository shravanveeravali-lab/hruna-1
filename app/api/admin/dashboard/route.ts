/**
 * Admin Dashboard (§3) — every statistic the existing UI already shows, computed from real rows.
 * requireAdmin() gates the whole route; every query below then relies on the SAME admin-inclusive
 * RLS clauses already built into Phase 1's policies (e.g. `customer_id = current_customer_id() OR
 * is_admin()`) — an admin session reading these tables through the normal authenticated client
 * sees everything, no service-role needed here at all.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { getCustomerSummaries, getDesignerSummaries } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

async function count(supabase: ReturnType<typeof createClient>, table: string, filter?: (q: any) => any) {
  let query = supabase.from(table as any).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count: n } = await query;
  return n ?? 0;
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const [
      totalCustomers,
      totalDesigners,
      verifiedDesigners,
      pendingVerifications,
      rejectedDesigners,
      suspendedDesigners,
      activeProjects,
      completedProjects,
      activeSubscriptions,
      pendingDisputes,
    ] = await Promise.all([
      count(supabase, "customer_profiles"),
      count(supabase, "designer_profiles"),
      count(supabase, "designer_verifications", (q) => q.eq("overall_status", "approved")),
      count(supabase, "designer_verifications", (q) => q.eq("overall_status", "pending")),
      count(supabase, "designer_verifications", (q) => q.eq("overall_status", "rejected")),
      count(supabase, "designer_verifications", (q) => q.eq("overall_status", "suspended")),
      count(supabase, "projects", (q) => q.in("status", ["active", "awaiting_confirmation"])),
      count(supabase, "projects", (q) => q.eq("status", "completed")),
      count(supabase, "user_subscriptions", (q) => q.eq("status", "active")),
      count(supabase, "disputes", (q) => q.in("status", ["open", "under_review"])),
    ]);

    // Revenue — last 6 months, from real `payments` rows only (none will exist until a payment
    // gateway is connected in a later phase; the chart correctly shows all zeros until then rather
    // than any fabricated number).
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const { data: recentPayments } = await supabase
      .from("payments")
      .select("amount, currency, paid_at, status")
      .eq("status", "succeeded")
      .gte("paid_at", sixMonthsAgo.toISOString());

    const now = new Date();
    const monthlyBars: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = (recentPayments ?? [])
        .filter((p) => p.paid_at && new Date(p.paid_at).getMonth() === d.getMonth() && new Date(p.paid_at).getFullYear() === d.getFullYear())
        .reduce((sum, p) => sum + Number(p.amount), 0);
      monthlyBars.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), total });
    }
    const monthlyRevenue = monthlyBars[monthlyBars.length - 1]?.total ?? 0;

    // Recent activity — real, timestamp-sorted events from the tables the existing dashboard
    // already draws from (no fabricated feed).
    const [
      { data: recentRequests },
      { data: recentProjects },
      { data: recentSubmissions },
      { data: recentApprovals },
      { data: recentDisputes },
    ] = await Promise.all([
      supabase.from("fashion_requests").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("projects").select("id, designer_id, status, completed_at, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("designer_verifications").select("designer_id, submitted_at").not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(5),
      supabase.from("designer_verifications").select("designer_id, reviewed_at, overall_status").eq("overall_status", "approved").not("reviewed_at", "is", null).order("reviewed_at", { ascending: false }).limit(5),
      supabase.from("disputes").select("id, issue, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const designerIds = [
      ...(recentProjects ?? []).map((p) => p.designer_id),
      ...(recentSubmissions ?? []).map((s) => s.designer_id),
      ...(recentApprovals ?? []).map((a) => a.designer_id),
    ];
    const designers = await getDesignerSummaries(supabase, designerIds);

    type ActivityItem = { id: string; text: string; timestamp: string; type: string };
    const activity: ActivityItem[] = [];
    for (const r of recentRequests ?? []) activity.push({ id: `req-${r.id}`, text: `New design request created — "${r.title}"`, timestamp: r.created_at, type: "request" });
    for (const p of recentProjects ?? []) {
      const name = designers.get(p.designer_id)?.name ?? p.designer_id;
      activity.push({ id: `proj-${p.id}`, text: `Project started with ${name}`, timestamp: p.created_at, type: "project" });
      if (p.status === "completed" && p.completed_at) activity.push({ id: `proj-done-${p.id}`, text: `Project completed with ${name}`, timestamp: p.completed_at, type: "project" });
    }
    for (const s of recentSubmissions ?? []) {
      const name = designers.get(s.designer_id)?.name ?? s.designer_id;
      if (s.submitted_at) activity.push({ id: `vsub-${s.designer_id}`, text: `Designer verification submitted — ${name}`, timestamp: s.submitted_at, type: "verification" });
    }
    for (const a of recentApprovals ?? []) {
      const name = designers.get(a.designer_id)?.name ?? a.designer_id;
      if (a.reviewed_at) activity.push({ id: `vapp-${a.designer_id}`, text: `Designer approved — ${name}`, timestamp: a.reviewed_at, type: "verification" });
    }
    for (const d of recentDisputes ?? []) activity.push({ id: `disp-${d.id}`, text: `Dispute opened — ${d.issue}`, timestamp: d.created_at, type: "dispute" });

    activity.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({
      status: "ok",
      stats: {
        totalCustomers,
        totalDesigners,
        verifiedDesigners,
        pendingVerifications,
        rejectedDesigners,
        suspendedDesigners,
        activeProjects,
        completedProjects,
        activeSubscriptions,
        pendingDisputes,
        monthlyRevenue,
      },
      monthlyBars,
      activity: activity.slice(0, 9),
    });
  } catch (err) {
    return errorResponse(err, "api.admin.dashboard");
  }
}
