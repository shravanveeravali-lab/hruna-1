/**
 * A single diary entry — get/edit/delete, all scoped to the owning customer by
 * diary_entries_all_owner RLS (no admin exception — see app/api/diary/route.ts's file comment).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapDiaryEntry, resolveDiaryImagesFull } from "@/lib/customer/data";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("id", params.id)
      .eq("customer_id", ctx.customerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ status: "error", message: "Diary entry not found." }, { status: 404 });
    }

    const images = await resolveDiaryImagesFull(supabase, data.id);
    return NextResponse.json({ status: "ok", entry: mapDiaryEntry(data, images) });
  } catch (err) {
    return errorResponse(err, "api.diary.detail");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCustomer();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"diary_entries"> = { updated_at: new Date().toISOString() };
    if (typeof body?.title === "string" && body.title.trim()) patch.title = body.title.trim();
    if (typeof body?.note === "string") patch.note = body.note;
    if (typeof body?.mood === "string") patch.mood = body.mood;

    const supabase = createClient();
    const { data: updated, error: updateError } = await supabase
      .from("diary_entries")
      .update(patch)
      .eq("id", params.id)
      .eq("customer_id", ctx.customerId)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return NextResponse.json({ status: "error", message: "Diary entry not found." }, { status: 404 });
    }

    // imageFileIds, when provided, is the full ordered replacement set — simplest correct model
    // for "edit an entry's images" without a separate add/remove/reorder API surface.
    if (Array.isArray(body?.imageFileIds)) {
      const imageFileIds: string[] = body.imageFileIds.filter((id: unknown): id is string => typeof id === "string");
      const { error: deleteError } = await supabase.from("diary_entry_images").delete().eq("entry_id", params.id);
      if (deleteError) throw deleteError;
      if (imageFileIds.length > 0) {
        const rows = imageFileIds.map((file_id, position) => ({ entry_id: params.id, file_id, position }));
        const { error: insertError } = await supabase.from("diary_entry_images").insert(rows);
        if (insertError) throw insertError;
      }
    }

    const images = await resolveDiaryImagesFull(supabase, params.id);
    return NextResponse.json({ status: "ok", entry: mapDiaryEntry(updated, images) });
  } catch (err) {
    return errorResponse(err, "api.diary.update");
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { error, count } = await supabase
      .from("diary_entries")
      .delete({ count: "exact" })
      .eq("id", params.id)
      .eq("customer_id", ctx.customerId);
    if (error) throw error;
    if (!count) {
      return NextResponse.json({ status: "error", message: "Diary entry not found." }, { status: 404 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.diary.delete");
  }
}
