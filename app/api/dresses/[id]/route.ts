/**
 * Public single-dress detail (Phase 7 fix) — powers /dresses/[id]. No auth required; RLS on
 * dresses/dress_images/designer_profiles is already public-read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { getDressDetail } from "@/lib/customer/discovery";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const result = await getDressDetail(supabase, params.id);
    if (!result) return NextResponse.json({ status: "error", message: "Dress not found." }, { status: 404 });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return errorResponse(err, "api.dresses.detail");
  }
}
