/**
 * Swipe/save interaction on a request (§7). designer_id always comes from the authenticated
 * session (requireApprovedDesigner() — swiping is part of the discover-feed workflow, so it's
 * gated the same as the feed itself) — never a client-supplied id, so Designer A can never record
 * an interaction "as" Designer B. Upserts into designer_request_interactions, whose primary key
 * (request_id, designer_id) is exactly what makes "no duplicate/conflicting interaction beyond
 * what the schema permits" true by construction — a second swipe just overwrites this designer's
 * own prior interaction on this same request, never creates a second row.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner, requireApprovedDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

/** This designer's own interaction (if any) with this one request — used by the request detail
 *  page to show the current like/save state. requireDesigner() (not approved-only): viewing your
 *  own past interaction shouldn't itself require current approval. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("designer_request_interactions")
      .select("*")
      .eq("request_id", params.id)
      .eq("designer_id", ctx.designerId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      interaction: data
        ? { requestId: data.request_id, designerId: data.designer_id, swipeStatus: data.swipe_status ?? undefined, saved: data.saved }
        : null,
    });
  } catch (err) {
    return errorResponse(err, "api.designer.requests.interaction.get");
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireApprovedDesigner();
    const body = await request.json().catch(() => null);

    const swipeStatus = body?.swipeStatus as "interested" | "declined" | undefined;
    const saved = typeof body?.saved === "boolean" ? body.saved : undefined;
    if (swipeStatus === undefined && saved === undefined) {
      return NextResponse.json({ status: "error", message: "Nothing to update." }, { status: 400 });
    }
    if (swipeStatus !== undefined && !["interested", "declined"].includes(swipeStatus)) {
      return NextResponse.json({ status: "error", message: "Invalid swipe status." }, { status: 400 });
    }

    const supabase = createClient();

    // Read-modify-write rather than a blind upsert: `saved` and `swipeStatus` are independent
    // facts on the same row (matching the existing frontend's separate Like/Save actions) — a
    // save action must not clobber an existing swipe status, and vice versa.
    const { data: existing } = await supabase
      .from("designer_request_interactions")
      .select("swipe_status, saved")
      .eq("request_id", params.id)
      .eq("designer_id", ctx.designerId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("designer_request_interactions")
      .upsert(
        {
          request_id: params.id,
          designer_id: ctx.designerId,
          swipe_status: swipeStatus ?? existing?.swipe_status ?? null,
          saved: saved ?? existing?.saved ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "request_id,designer_id" }
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      interaction: { requestId: data.request_id, designerId: data.designer_id, swipeStatus: data.swipe_status ?? undefined, saved: data.saved },
    });
  } catch (err) {
    return errorResponse(err, "api.designer.requests.interaction");
  }
}
