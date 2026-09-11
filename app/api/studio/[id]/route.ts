/**
 * A designer's public Studio bundle (§31: the PUBLIC view, kept separate from Manage Studio's
 * write endpoints under app/api/designer/studio/*). No auth required — RLS on every table involved
 * is already public-read. Shared shaping logic lives in lib/designer/studio-bundle.ts, also used
 * directly (no HTTP round-trip) by the two Server Component pages that render this same data —
 * see that file's comment for the full list of consumers.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { getStudioBundle } from "@/lib/designer/studio-bundle";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const bundle = await getStudioBundle(supabase, params.id);
    if (!bundle) {
      return NextResponse.json({ status: "error", message: "Studio not found." }, { status: 404 });
    }
    return NextResponse.json({ status: "ok", ...bundle });
  } catch (err) {
    return errorResponse(err, "api.studio.detail");
  }
}
