/**
 * A single request's canonical detail — relies entirely on fashion_requests_select's own RLS
 * (owning customer, admin, an eligible approved designer if public, or the preferred designer if
 * private) rather than re-deciding visibility here: this route just queries by id and returns
 * whatever RLS lets the current session see, which is `null`/404 for anyone unauthorized.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapRequest, resolveRequestImages } from "@/lib/customer/data";
import { getCustomerSummaries } from "@/lib/designer/data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("fashion_requests")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ status: "error", message: "Request not found." }, { status: 404 });
    }

    const images = await resolveRequestImages(supabase, data.id);
    // Embedding the customer summary here (not just on the customer's own view) is what lets an
    // eligible designer see who they'd be working with — the same "who can see this row at all"
    // question is still answered entirely by fashion_requests_select RLS above; this only adds
    // display context for whoever RLS already let through.
    const customers = await getCustomerSummaries(supabase, [data.customer_id]);
    return NextResponse.json({
      status: "ok",
      request: { ...mapRequest(data, images), customer: customers.get(data.customer_id) },
    });
  } catch (err) {
    return errorResponse(err, "api.requests.detail");
  }
}
