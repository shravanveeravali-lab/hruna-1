/**
 * Fashion Diary — strictly private (§20 of the Phase 4 brief). diary_entries_all_owner RLS has no
 * admin exception at all (unlike almost every other table in this schema) — only the owning
 * customer can ever see these rows, and this route relies on that rather than adding its own,
 * separate privacy check.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { mapDiaryEntry, resolveDiaryImagesFull } from "@/lib/customer/data";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireCustomer();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("customer_id", ctx.customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const entries = await Promise.all(
      (data ?? []).map(async (row) => mapDiaryEntry(row, await resolveDiaryImagesFull(supabase, row.id)))
    );

    return NextResponse.json({ status: "ok", entries });
  } catch (err) {
    return errorResponse(err, "api.diary.list");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCustomer();
    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ status: "error", message: "Give your entry a title." }, { status: 400 });
    }
    const imageFileIds: string[] = Array.isArray(body?.imageFileIds)
      ? body.imageFileIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    const supabase = createClient();
    const insert: TablesInsert<"diary_entries"> = {
      customer_id: ctx.customerId,
      title,
      note: typeof body?.note === "string" ? body.note : null,
      mood: typeof body?.mood === "string" ? body.mood : null,
    };
    const { data: created, error: insertError } = await supabase.from("diary_entries").insert(insert).select().single();
    if (insertError) throw insertError;

    if (imageFileIds.length > 0) {
      const rows = imageFileIds.map((file_id, position) => ({ entry_id: created.id, file_id, position }));
      const { error: imagesError } = await supabase.from("diary_entry_images").insert(rows);
      if (imagesError) throw imagesError;
    }

    const images = await resolveDiaryImagesFull(supabase, created.id);
    return NextResponse.json({ status: "ok", entry: mapDiaryEntry(created, images) });
  } catch (err) {
    return errorResponse(err, "api.diary.create");
  }
}
