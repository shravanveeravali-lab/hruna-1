/**
 * Designer's own conversations — list + get-or-create. Exact designer-side mirror of
 * app/api/conversations/route.ts (§20/§19) — same conversation_previews view, scoped by
 * designer_id instead of customer_id, embedding a customer summary instead of a designer one.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse, isPostgrestError } from "@/lib/supabase/errors";
import { getCustomerSummaries } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("conversation_previews")
      .select("*")
      .eq("designer_id", ctx.designerId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const customers = await getCustomerSummaries(supabase, (data ?? []).map((c) => c.customer_id!).filter(Boolean));

    const conversations = (data ?? []).map((c) => ({
      id: c.id,
      customerId: c.customer_id,
      designerId: c.designer_id,
      lastMessage: c.last_message ?? "",
      lastTimestamp: c.last_message_at ?? "",
      unread: c.designer_unread_count ?? 0,
      customer: c.customer_id ? customers.get(c.customer_id) : undefined,
    }));

    return NextResponse.json({ status: "ok", conversations });
  } catch (err) {
    return errorResponse(err, "api.designer.conversations.list");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);
    const customerId = typeof body?.customerId === "string" ? body.customerId : "";
    if (!customerId) {
      return NextResponse.json({ status: "error", message: "customerId is required." }, { status: 400 });
    }

    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("conversations")
      .insert({ customer_id: customerId, designer_id: ctx.designerId })
      .select()
      .single();

    if (!insertError) {
      return NextResponse.json({ status: "ok", conversationId: created.id });
    }

    if (isPostgrestError(insertError) && insertError.code === "23505") {
      const { data: existing, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .eq("designer_id", ctx.designerId)
        .single();
      if (fetchError) throw fetchError;
      return NextResponse.json({ status: "ok", conversationId: existing.id });
    }

    throw insertError;
  } catch (err) {
    return errorResponse(err, "api.designer.conversations.getOrCreate");
  }
}
