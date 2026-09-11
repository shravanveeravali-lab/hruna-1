/**
 * Customer activity/notifications feed (Phase 9 gap-fill) — this page was found completely
 * disconnected: a hardcoded local array of fake events (mock designer names, mock request titles,
 * links to mock ids like "/requests/req-1" that don't exist in the real, UUID-routed app at all).
 * No dedicated notifications table exists in the schema, and building one (plus wiring an insert
 * into every event source below) would be new business functionality, not a connection of
 * something already there — instead, this mirrors the SAME real, timestamp-sorted aggregation
 * pattern app/api/admin/dashboard/route.ts already uses for its "recent activity" feed, scoped to
 * the signed-in customer's own rows via the regular authenticated client (RLS already scopes every
 * query below to rows this customer is a party to — no service-role, no broader read than the
 * customer already has elsewhere in the app).
 *
 * "Read" state is intentionally NOT persisted anywhere (no new column, no new table) — the
 * original mock page didn't persist it either (a plain useState, reset on reload); the frontend
 * keeps that exact same ephemeral behavior, just backed by real event data now.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { getDesignerSummaries } from "@/lib/customer/data";

export const dynamic = "force-dynamic";

interface NotificationItem {
  id: string;
  type: "proposal" | "message" | "progress" | "completion";
  text: string;
  href: string;
  timestamp: string;
}

export async function GET() {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data: myRequests } = await supabase.from("fashion_requests").select("id, title").eq("customer_id", ctx.customerId);
    const requestIds = (myRequests ?? []).map((r) => r.id);
    const requestTitleById = new Map((myRequests ?? []).map((r) => [r.id, r.title]));

    const { data: myProjects } = await supabase.from("projects").select("id, request_id, designer_id, status, updated_at").eq("customer_id", ctx.customerId);
    const projectIds = (myProjects ?? []).map((p) => p.id);

    const { data: myConversations } = await supabase.from("conversations").select("id, designer_id").eq("customer_id", ctx.customerId);
    const conversationIds = (myConversations ?? []).map((c) => c.id);
    const designerIdByConversation = new Map((myConversations ?? []).map((c) => [c.id, c.designer_id]));

    const [{ data: recentProposals }, { data: recentMessages }, { data: recentUpdates }] = await Promise.all([
      requestIds.length
        ? supabase.from("proposals").select("id, request_id, designer_id, created_at").in("request_id", requestIds).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] as { id: string; request_id: string; designer_id: string; created_at: string }[] }),
      conversationIds.length
        ? supabase.from("messages").select("id, conversation_id, sender_id, text, created_at").in("conversation_id", conversationIds).neq("sender_id", ctx.user.id).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] as { id: string; conversation_id: string; sender_id: string; text: string; created_at: string }[] }),
      projectIds.length
        ? supabase.from("project_updates").select("id, project_id, stage, created_at").in("project_id", projectIds).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] as { id: string; project_id: string; stage: string; created_at: string }[] }),
    ]);

    const designerIds = [
      ...(recentProposals ?? []).map((p) => p.designer_id),
      ...conversationIds.map((id) => designerIdByConversation.get(id)!).filter(Boolean),
      ...(myProjects ?? []).map((p) => p.designer_id),
    ];
    const designers = await getDesignerSummaries(supabase, designerIds);
    const projectById = new Map((myProjects ?? []).map((p) => [p.id, p]));

    const items: NotificationItem[] = [];
    for (const p of recentProposals ?? []) {
      const name = designers.get(p.designer_id)?.name ?? "A designer";
      const title = requestTitleById.get(p.request_id) ?? "your request";
      items.push({ id: `proposal-${p.id}`, type: "proposal", text: `${name} sent a proposal for "${title}".`, href: `/requests/${p.request_id}`, timestamp: p.created_at });
    }
    for (const m of recentMessages ?? []) {
      const designerId = designerIdByConversation.get(m.conversation_id);
      const name = designerId ? designers.get(designerId)?.name ?? "your designer" : "your designer";
      items.push({ id: `message-${m.id}`, type: "message", text: `New message from ${name}.`, href: `/messages?conversationId=${m.conversation_id}`, timestamp: m.created_at });
    }
    for (const u of recentUpdates ?? []) {
      const project = projectById.get(u.project_id);
      if (!project) continue;
      const title = requestTitleById.get(project.request_id) ?? "Your project";
      items.push({ id: `update-${u.id}`, type: "progress", text: `${title} moved to the ${u.stage} stage.`, href: `/projects/${u.project_id}`, timestamp: u.created_at });
    }
    for (const p of myProjects ?? []) {
      if (p.status !== "awaiting_confirmation") continue;
      const name = designers.get(p.designer_id)?.name ?? "Your designer";
      const title = requestTitleById.get(p.request_id) ?? "your project";
      items.push({ id: `completion-${p.id}`, type: "completion", text: `${name} marked "${title}" as completed. Please confirm.`, href: `/projects/${p.id}`, timestamp: p.updated_at });
    }

    items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return NextResponse.json({ status: "ok", notifications: items.slice(0, 12) });
  } catch (err) {
    return errorResponse(err, "api.notifications.list");
  }
}
