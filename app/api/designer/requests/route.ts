/**
 * "My Requests" for the designer — the union of (a) requests directed at them
 * (preferred_designer_id = them), (b) public requests they've swiped/saved on, and (c) ANY request
 * they've submitted a proposal on. (c) was missing — a designer could open a public request
 * straight from its detail page and propose without ever swiping "interested" on it first (no
 * designer_request_interactions row gets created by proposal submission), and that request would
 * then never appear ANYWHERE on this page again — not under "New", not under "Accepted Designs"
 * even after the customer accepted it — because "relevant" only ever checked interactions, not
 * proposals. A designer's own proposal is unambiguously relevant to them regardless of interaction
 * history, so it's now its own inclusion path, same as (a) and (b).
 *
 * requireDesigner() (not requireApprovedDesigner()): a non-approved designer legitimately sees an
 * empty list here (RLS's fashion_requests_select only returns directed requests targeting an
 * APPROVED designer, and the interaction-based public set is empty since the feed itself requires
 * approval) — the page should render an empty state, not a 403, for that case.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapRequest, resolveRequestImages } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();

    const [{ data: direct, error: directError }, { data: interactions, error: interactionsError }, { data: ownProposals, error: proposalsError }] = await Promise.all([
      supabase.from("fashion_requests").select("*").eq("preferred_designer_id", ctx.designerId),
      supabase.from("designer_request_interactions").select("*").eq("designer_id", ctx.designerId),
      supabase.from("proposals").select("request_id").eq("designer_id", ctx.designerId),
    ]);
    if (directError) throw directError;
    if (interactionsError) throw interactionsError;
    if (proposalsError) throw proposalsError;

    const interactedIds = (interactions ?? []).map((i) => i.request_id);
    const { data: publicInteracted, error: publicError } = interactedIds.length
      ? await supabase.from("fashion_requests").select("*").in("id", interactedIds).is("preferred_designer_id", null)
      : { data: [] as typeof direct, error: null };
    if (publicError) throw publicError;

    const proposedIds = (ownProposals ?? []).map((p) => p.request_id);
    const { data: proposedRequests, error: proposedError } = proposedIds.length
      ? await supabase.from("fashion_requests").select("*").in("id", proposedIds)
      : { data: [] as typeof direct, error: null };
    if (proposedError) throw proposedError;

    const byId = new Map<string, (typeof direct)[number]>();
    for (const r of [...(direct ?? []), ...(publicInteracted ?? []), ...(proposedRequests ?? [])]) byId.set(r.id, r);

    const requests = await Promise.all(
      [...byId.values()].map(async (row) => mapRequest(row, await resolveRequestImages(supabase, row.id)))
    );

    const mappedInteractions = (interactions ?? []).map((i) => ({
      requestId: i.request_id,
      designerId: i.designer_id,
      swipeStatus: i.swipe_status ?? undefined,
      saved: i.saved,
    }));

    return NextResponse.json({ status: "ok", requests, interactions: mappedInteractions });
  } catch (err) {
    return errorResponse(err, "api.designer.requests.list");
  }
}
