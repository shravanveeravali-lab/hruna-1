/**
 * Minimal Supabase connectivity check — the "does the backend foundation actually work" probe
 * this phase asks for. NOT a business endpoint: it reads one public, RLS-safe table
 * (subscription_plans — publicly readable per the RLS migration) purely to prove the round trip
 * (env vars → client → network → Postgres → RLS → response) works end to end, and reports
 * whether a session cookie is currently present. Nothing here creates/updates/deletes anything.
 *
 * GET /api/health while `npm run dev` + `npm run db:start` are both running.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

// This route reads the auth cookie (to report `authenticated`), so it can never be statically
// cached — force-dynamic makes that explicit rather than letting Next's build-time static-vs-
// dynamic probe discover it via a thrown DYNAMIC_SERVER_USAGE control-flow error, which otherwise
// gets caught by the try/catch below and misreported as a real Supabase error in the build log.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    const { count, error } = await supabase
      .from("subscription_plans")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      subscriptionPlansSeeded: count,
      authenticated: user !== null,
    });
  } catch (err) {
    const appError = toAppError(err, "api.health");
    return NextResponse.json({ status: "error", message: appError.message }, { status: 500 });
  }
}
