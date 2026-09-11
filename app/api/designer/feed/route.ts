/**
 * The Discover Requests swipe feed (§5 of the Phase 5 brief — explicitly critical). This is
 * deliberately NOT `SELECT * FROM fashion_requests` (§44): it's gated by requireApprovedDesigner()
 * (server-side, not just a frontend check) AND by fashion_requests_select's own RLS, which for a
 * non-preferred row only ever returns it to a designer for whom is_approved_designer() is true —
 * two independent layers landing on the same restriction, neither trusting the other alone.
 *
 * "submitted, public, not yet interacted with" mirrors the existing mock feed's own filter exactly
 * (app/(designer)/designer/discover-requests/page.tsx) — same rule, now enforced against real data
 * instead of derived from an in-memory array.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapRequest, resolveRequestImages } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireApprovedDesigner();
    const supabase = createClient();

    const [{ data: requests, error }, { data: interactions }] = await Promise.all([
      supabase
        .from("fashion_requests")
        .select("*")
        .eq("status", "submitted")
        .is("preferred_designer_id", null)
        .order("created_at", { ascending: false }),
      supabase.from("designer_request_interactions").select("request_id").eq("designer_id", ctx.designerId),
    ]);
    if (error) throw error;

    const interactedIds = new Set((interactions ?? []).map((i) => i.request_id));
    const feed = (requests ?? []).filter((r) => !interactedIds.has(r.id));

    const mapped = await Promise.all(
      feed.map(async (row) => mapRequest(row, await resolveRequestImages(supabase, row.id)))
    );

    return NextResponse.json({ status: "ok", requests: mapped });
  } catch (err) {
    return errorResponse(err, "api.designer.feed");
  }
}
