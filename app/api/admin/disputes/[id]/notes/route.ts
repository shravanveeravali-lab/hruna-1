/**
 * Adds an admin note to a dispute (§12) — dispute_notes is append-only (no update/delete RLS
 * policy exists for any role, per its own migration comment), so this is the only write this
 * table ever gets. admin_id always comes from the session, never the client.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapDisputeNote } from "@/lib/admin/data";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ status: "error", message: "Note can't be empty." }, { status: 400 });

    const supabase = createClient();
    const insert: TablesInsert<"dispute_notes"> = { dispute_id: params.id, admin_id: ctx.user.id, note: text };
    const { data, error } = await supabase.from("dispute_notes").insert(insert).select().single();
    if (error) throw error;

    const { data: adminUser } = await supabase.from("users").select("display_name, email").eq("id", ctx.user.id).maybeSingle();
    return NextResponse.json({ status: "ok", note: mapDisputeNote(data, adminUser?.display_name || adminUser?.email || "Admin") });
  } catch (err) {
    return errorResponse(err, "api.admin.disputes.notes");
  }
}
