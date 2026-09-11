/**
 * Simulates handing the person off to an identity/KYC provider — same as the existing mock, since
 * no real identity-verification provider is part of this architecture. Only ever results in
 * 'pending', never 'verified' (only an admin action can do that).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireDesigner();
    const supabase = createClient();

    // designer_verifications is admin-write-only by RLS (see 20260829180013_rls.sql's
    // designer_verifications_update_admin_only) — a plain .update() here is silently blocked (0
    // rows affected, no thrown error), which is exactly how this previously shipped broken: the
    // route returned a false "ok" while writing nothing. start_identity_verification() is the one
    // narrow, self-service exception (see its own migration comment) — re-verifies ownership and
    // the date-of-birth precondition itself, server-side, before writing.
    const { error } = await supabase.rpc("start_identity_verification");
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.onboarding.startIdentity");
  }
}
