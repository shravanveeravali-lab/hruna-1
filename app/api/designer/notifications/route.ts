/**
 * Designer activity/notifications feed (Phase 9 gap-fill) — same fix as app/api/notifications
 * (customer side): the page was a hardcoded local array of fake events with broken mock-id links.
 * No dedicated notifications table exists; this aggregates real, timestamp-sorted events from
 * tables the designer already has real access to, mirroring app/api/admin/dashboard's established
 * pattern. "New request" items are only included when the designer is actually approved (matches
 * the swipe feed's own eligibility rule, app/api/designer/feed) — a pending/rejected/suspended
 * designer still gets a real feed of whatever else applies to them (completions, reviews,
 * verification status), just never a request item they couldn't act on anyway.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

interface NotificationItem {
  id: string;
  type: "request" | "completion" | "review" | "verification";
  text: string;
  href: string;
  timestamp: string;
}

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const [{ data: verification }, { data: myProjects }, { data: recentReviews }] = await Promise.all([
      supabase.from("designer_verifications").select("overall_status, reviewed_at, profile_review_note").eq("designer_id", ctx.designerId).maybeSingle(),
      supabase.from("projects").select("id, request_id, status, completed_at").eq("designer_id", ctx.designerId).eq("status", "completed").order("completed_at", { ascending: false }).limit(5),
      supabase.from("reviews").select("id, rating, created_at").eq("designer_id", ctx.designerId).order("created_at", { ascending: false }).limit(5),
    ]);

    const items: NotificationItem[] = [];

    if (verification?.overall_status === "approved") {
      const { data: interactions } = await supabase.from("designer_request_interactions").select("request_id").eq("designer_id", ctx.designerId);
      const interactedIds = new Set((interactions ?? []).map((i) => i.request_id));
      const { data: recentRequests } = await supabase
        .from("fashion_requests")
        .select("id, title, created_at")
        .eq("status", "submitted")
        .is("preferred_designer_id", null)
        .order("created_at", { ascending: false })
        .limit(8);
      for (const r of recentRequests ?? []) {
        if (interactedIds.has(r.id)) continue;
        items.push({ id: `request-${r.id}`, type: "request", text: `New fashion request: "${r.title}".`, href: `/designer/requests/${r.id}`, timestamp: r.created_at });
      }
    }

    for (const p of myProjects ?? []) {
      if (!p.completed_at) continue;
      items.push({ id: `completion-${p.id}`, type: "completion", text: "The customer confirmed completion of a project.", href: `/designer/projects/${p.id}`, timestamp: p.completed_at });
    }

    for (const r of recentReviews ?? []) {
      items.push({ id: `review-${r.id}`, type: "review", text: `You received a new ${r.rating}-star review.`, href: "/designer/reviews", timestamp: r.created_at });
    }

    if (verification?.reviewed_at && (verification.overall_status === "approved" || verification.overall_status === "rejected")) {
      const text = verification.overall_status === "approved" ? "Your studio verification was approved." : "Your studio verification was not approved.";
      items.push({ id: "verification-status", type: "verification", text, href: "/designer/profile", timestamp: verification.reviewed_at });
    }

    items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return NextResponse.json({ status: "ok", notifications: items.slice(0, 12) });
  } catch (err) {
    return errorResponse(err, "api.designer.notifications.list");
  }
}
