import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapCollection, resolveStudioImage } from "@/lib/designer/data";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"collections"> = { updated_at: new Date().toISOString() };
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.category === "string") patch.category = body.category;
    if (typeof body?.description === "string") patch.description = body.description;
    if (body && "coverImageFileId" in body) {
      patch.cover_image_file_id = typeof body.coverImageFileId === "string" ? body.coverImageFileId : null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("collections")
      .update(patch)
      .eq("id", params.id)
      .eq("designer_id", ctx.designerId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "error", message: "Collection not found." }, { status: 404 });

    const { data: dresses } = await supabase.from("dresses").select("id").eq("collection_id", data.id);
    const cover = await resolveStudioImage(supabase, data.cover_image_file_id);
    return NextResponse.json({ status: "ok", collection: mapCollection(data, cover, (dresses ?? []).map((d) => d.id)) });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.collections.update");
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();
    // dresses.collection_id is ON DELETE CASCADE (matches the existing frontend's deleteCollection
    // behavior, which already deletes its dresses too — see the migration's own comment on why).
    const { error, count } = await supabase
      .from("collections")
      .delete({ count: "exact" })
      .eq("id", params.id)
      .eq("designer_id", ctx.designerId);
    if (error) throw error;
    if (!count) return NextResponse.json({ status: "error", message: "Collection not found." }, { status: 404 });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.collections.delete");
  }
}
