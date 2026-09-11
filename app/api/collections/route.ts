/**
 * Public collection lookup by id list (Phase 7 fix) — powers the Saved Items page resolving
 * exactly the collections a customer saved. No auth required; RLS on collections is public-read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { listCollectionsByIds } from "@/lib/customer/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const ids = new URL(request.url).searchParams.get("ids") ?? "";
    const collections = ids ? await listCollectionsByIds(supabase, ids.split(",")) : [];
    return NextResponse.json({ status: "ok", collections });
  } catch (err) {
    return errorResponse(err, "api.collections.list");
  }
}
