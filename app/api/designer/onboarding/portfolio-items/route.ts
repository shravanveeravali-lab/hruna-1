import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapPortfolioItem, resolvePortfolioItemImage } from "@/lib/designer/data";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);
    const fileId = typeof body?.fileId === "string" ? body.fileId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!fileId || !title) {
      return NextResponse.json({ status: "error", message: "An image and a title are required." }, { status: 400 });
    }

    const supabase = createClient();
    const insert: TablesInsert<"designer_portfolio_items"> = {
      designer_id: ctx.designerId,
      file_id: fileId,
      title,
      category: typeof body?.category === "string" ? body.category : null,
      description: typeof body?.description === "string" ? body.description : null,
      year: typeof body?.year === "string" ? body.year : null,
    };
    const { data, error } = await supabase.from("designer_portfolio_items").insert(insert).select().single();
    if (error) throw error;

    const image = await resolvePortfolioItemImage(supabase, data.file_id);
    return NextResponse.json({ status: "ok", item: mapPortfolioItem(data, image) });
  } catch (err) {
    return errorResponse(err, "api.designer.onboarding.portfolioItems.create");
  }
}
