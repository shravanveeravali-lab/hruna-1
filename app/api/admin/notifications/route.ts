/**
 * System Notifications (§17) — admin_notifications_admin_all RLS is admin-only for both read and
 * write, so this table is never reachable by a customer/designer session, matching the existing
 * UI (nothing customer/designer-facing reads these into a per-user inbox yet, per the table's own
 * migration comment).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapAdminNotification } from "@/lib/admin/data";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const adminIds = [...new Set((data ?? []).map((n) => n.created_by))];
    const { data: adminUsers } = adminIds.length
      ? await supabase.from("users").select("id, display_name, email").in("id", adminIds)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
    const adminNameById = new Map((adminUsers ?? []).map((u) => [u.id, u.display_name || u.email || "Admin"]));

    return NextResponse.json({
      status: "ok",
      notifications: (data ?? []).map((n) => mapAdminNotification(n, adminNameById.get(n.created_by) ?? "Admin")),
    });
  } catch (err) {
    return errorResponse(err, "api.admin.notifications.list");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const audience = ["all", "customer", "designer"].includes(body?.audience) ? body.audience : "all";
    if (!title || !message) {
      return NextResponse.json({ status: "error", message: "A title and a message are required." }, { status: 400 });
    }

    const supabase = createClient();
    const insert: TablesInsert<"admin_notifications"> = { created_by: ctx.user.id, title, message, audience };
    const { data, error } = await supabase.from("admin_notifications").insert(insert).select().single();
    if (error) throw error;

    const { data: adminUser } = await supabase.from("users").select("display_name, email").eq("id", ctx.user.id).maybeSingle();
    return NextResponse.json({ status: "ok", notification: mapAdminNotification(data, adminUser?.display_name || adminUser?.email || "Admin") });
  } catch (err) {
    return errorResponse(err, "api.admin.notifications.create");
  }
}
