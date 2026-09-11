/**
 * Public designer directory (Phase 7 fix) — powers the customer Discover page's search/filter UI,
 * and (via ?ids=) the Saved Items page resolving exactly the designers a customer saved. No auth
 * required; RLS on designer_profiles/designer_verifications is already public-read. Without
 * ?ids=, approved designers only (the customer-facing catalog, not a raw table dump); with
 * ?ids=, any designer matching those ids regardless of status (see listDesignersByIds).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";
import { listApprovedDesigners, listDesignersByIds } from "@/lib/customer/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const ids = new URL(request.url).searchParams.get("ids");
    const designers = ids ? await listDesignersByIds(supabase, ids.split(",")) : await listApprovedDesigners(supabase);
    return NextResponse.json({ status: "ok", designers });
  } catch (err) {
    return errorResponse(err, "api.designers.list");
  }
}
