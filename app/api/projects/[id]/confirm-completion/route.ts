/**
 * Customer-side half of the two-sided completion workflow (§24 of the Phase 5 brief, completing
 * what Phase 4 deliberately left stubbed). Only the request's own customer can confirm, only from
 * `awaiting_confirmation`, and only forward to `completed` — a designer can never force this
 * transition (projects_update_participant RLS would allow the row update, but this route itself is
 * customer-only via requireCustomer(), and the WHERE clause additionally requires the caller to be
 * this project's own customer_id).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data: updated, error } = await supabase
      .from("projects")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("customer_id", ctx.customerId)
      .eq("status", "awaiting_confirmation")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "This project isn't awaiting your confirmation." },
        { status: 400 }
      );
    }

    return NextResponse.json({ status: "ok", project: updated });
  } catch (err) {
    return errorResponse(err, "api.projects.confirmCompletion");
  }
}
