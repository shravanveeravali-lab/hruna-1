import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapMeetEntry, resolveStudioImage } from "@/lib/designer/data";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"meet_the_designer_entries"> = {};
    if (typeof body?.fileId === "string") patch.file_id = body.fileId;
    if (typeof body?.description === "string") patch.description = body.description;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("meet_the_designer_entries")
      .update(patch)
      .eq("id", params.id)
      .eq("designer_id", ctx.designerId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "error", message: "Entry not found." }, { status: 404 });

    const image = await resolveStudioImage(supabase, data.file_id);
    return NextResponse.json({ status: "ok", entry: mapMeetEntry(data, image) });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.meetEntries.update");
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();
    const { error, count } = await supabase
      .from("meet_the_designer_entries")
      .delete({ count: "exact" })
      .eq("id", params.id)
      .eq("designer_id", ctx.designerId);
    if (error) throw error;
    if (!count) return NextResponse.json({ status: "error", message: "Entry not found." }, { status: 404 });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.meetEntries.delete");
  }
}
