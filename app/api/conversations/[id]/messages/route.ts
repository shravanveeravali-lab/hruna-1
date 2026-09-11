/**
 * Messages within one conversation — list + send. Shared by both sides (Phase 4: customer, Phase
 * 5: designer) — conversations_select/messages_select RLS already restricts a conversation to its
 * two participants (+ admin), so this route only needs requireUser() and then resolves which side
 * the caller is on for the read-receipt column, rather than assuming "customer" as it did in
 * Phase 4. `sender_id` is always the authenticated user's own id, never trusted from the client.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Best-effort read receipt on whichever side the caller is — each update only touches a row
    // this caller already owns via conversations_update_participant RLS; if neither id matches
    // (unauthorized), both simply update 0 rows.
    if (ctx.customerId) {
      await supabase
        .from("conversations")
        .update({ customer_last_read_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("customer_id", ctx.customerId);
    }
    if (ctx.designerId) {
      await supabase
        .from("conversations")
        .update({ designer_last_read_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("designer_id", ctx.designerId);
    }

    const messages = (data ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      text: m.text,
      timestamp: m.created_at,
    }));

    return NextResponse.json({ status: "ok", messages });
  } catch (err) {
    return errorResponse(err, "api.conversations.messages.list");
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ status: "error", message: "Message can't be empty." }, { status: 400 });
    }

    const supabase = createClient();
    const insert: TablesInsert<"messages"> = {
      conversation_id: params.id,
      sender_id: ctx.user.id,
      text,
    };
    const { data, error } = await supabase.from("messages").insert(insert).select().single();
    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      message: { id: data.id, senderId: data.sender_id, text: data.text, timestamp: data.created_at },
    });
  } catch (err) {
    return errorResponse(err, "api.conversations.messages.send");
  }
}
