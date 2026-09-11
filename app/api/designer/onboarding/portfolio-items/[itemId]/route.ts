import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapPortfolioItem, resolvePortfolioItemImage } from "@/lib/designer/data";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { itemId: string } }) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"designer_portfolio_items"> = {};
    if (typeof body?.fileId === "string") patch.file_id = body.fileId;
    if (typeof body?.title === "string" && body.title.trim()) patch.title = body.title.trim();
    if (typeof body?.category === "string") patch.category = body.category;
    if (typeof body?.description === "string") patch.description = body.description;
    if (typeof body?.year === "string") patch.year = body.year;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("designer_portfolio_items")
      .update(patch)
      .eq("id", params.itemId)
      .eq("designer_id", ctx.designerId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "error", message: "Portfolio item not found." }, { status: 404 });

    const image = await resolvePortfolioItemImage(supabase, data.file_id);
    return NextResponse.json({ status: "ok", item: mapPortfolioItem(data, image) });
  } catch (err) {
    return errorResponse(err, "api.designer.onboarding.portfolioItems.update");
  }
}

export async function DELETE(_request: Request, { params }: { params: { itemId: string } }) {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();
    const { error, count } = await supabase
      .from("designer_portfolio_items")
      .delete({ count: "exact" })
      .eq("id", params.itemId)
      .eq("designer_id", ctx.designerId);
    if (error) throw error;
    if (!count) return NextResponse.json({ status: "error", message: "Portfolio item not found." }, { status: 404 });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.onboarding.portfolioItems.delete");
  }
}
