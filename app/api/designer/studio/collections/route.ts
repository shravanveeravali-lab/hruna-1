/**
 * Collections CRUD (§28). No count limit — collections are an ordinary owner-scoped list.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapCollection, resolveStudioImage } from "@/lib/designer/data";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ status: "error", message: "A collection name is required." }, { status: 400 });
    }

    const supabase = createClient();
    const insert: TablesInsert<"collections"> = {
      designer_id: ctx.designerId,
      name,
      category: typeof body?.category === "string" ? body.category : null,
      description: typeof body?.description === "string" ? body.description : null,
      cover_image_file_id: typeof body?.coverImageFileId === "string" ? body.coverImageFileId : null,
    };
    const { data, error } = await supabase.from("collections").insert(insert).select().single();
    if (error) throw error;

    const cover = await resolveStudioImage(supabase, data.cover_image_file_id);
    return NextResponse.json({ status: "ok", collection: mapCollection(data, cover, []) });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.collections.create");
  }
}
