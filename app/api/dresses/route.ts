/**
 * Public dress lookup by id list (Phase 7 fix) — powers the Saved Items page resolving exactly
 * the dresses a customer saved. No auth required; RLS on dresses/dress_images is public-read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { listDressesByIds } from "@/lib/customer/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const ids = new URL(request.url).searchParams.get("ids") ?? "";
    const dresses = ids ? await listDressesByIds(supabase, ids.split(",")) : [];
    return NextResponse.json({ status: "ok", dresses });
  } catch (err) {
    return errorResponse(err, "api.dresses.list");
  }
}
