/**
 * Accept a proposal — the one write in this phase that needs atomicity beyond what a single-table
 * RLS-guarded insert/update can give (verify ownership, verify eligibility, accept, auto-decline
 * siblings, create the project — see §12/§27 of the Phase 4 brief). All of that runs inside
 * public.accept_proposal() (supabase/migrations/20260830000001_accept_proposal.sql), called here
 * through the AUTHENTICATED server client via .rpc() — never the admin client. The function itself
 * re-verifies the caller owns the request before doing anything, so this route doesn't (and
 * shouldn't) duplicate that check.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse, isPostgrestError } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireCustomer();
    const supabase = createClient();

    const { data, error } = await supabase.rpc("accept_proposal", { p_proposal_id: params.id });
    if (error) {
      // The partial unique index (proposals_one_accepted_per_request) is the final guarantee
      // against a race where two different proposals on the same request are both accepted
      // concurrently — surfaced here as a clean 409 rather than a generic 500.
      if (isPostgrestError(error) && error.code === "23505") {
        return NextResponse.json(
          { status: "error", message: "This request already has an accepted proposal." },
          { status: 409 }
        );
      }
      // P0001 = a plain `raise exception` inside accept_proposal() itself (not found / not your
      // request / no longer pending) — every message that function raises was authored here as
      // already safe and user-facing (see the migration), so it's fine to surface directly rather
      // than collapsing it into toAppError's generic "Something went wrong" fallback.
      if (isPostgrestError(error) && error.code === "P0001") {
        return NextResponse.json({ status: "error", message: error.message }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ status: "ok", project: data });
  } catch (err) {
    return errorResponse(err, "api.proposals.accept");
  }
}
