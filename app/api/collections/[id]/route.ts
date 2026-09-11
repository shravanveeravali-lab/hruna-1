/**
 * Public single-collection detail (Phase 7 fix) — powers /collections/[id]. No auth required; RLS
 * on collections/dresses/designer_profiles is already public-read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { getCollectionDetail } from "@/lib/customer/discovery";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const result = await getCollectionDetail(supabase, params.id);
    if (!result) return NextResponse.json({ status: "error", message: "Collection not found." }, { status: 404 });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return errorResponse(err, "api.collections.detail");
  }
}
