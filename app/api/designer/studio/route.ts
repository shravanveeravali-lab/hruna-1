/**
 * Studio-level business info + banner (§25, the "Studio Info" tab + "Edit Banner" on Manage
 * Studio) — distinct from the designer's personal profile (app/api/designer/profile/route.ts).
 * GET returns the same public bundle as app/api/studio/[id]/route.ts, using the caller's own id —
 * one bundle shape, reused by both the public page and this owner's management page. PATCH is
 * scoped to the caller's own designer_profiles row; never accepts rating/review_count/type or any
 * admin/derived field.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDesigner } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";
import { getStudioBundle } from "@/lib/designer/studio-bundle";
import type { TablesUpdate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireDesigner();
    const supabase = createClient();
    const bundle = await getStudioBundle(supabase, ctx.designerId);
    if (!bundle) {
      return NextResponse.json({ status: "error", message: "Studio not found." }, { status: 404 });
    }
    return NextResponse.json({ status: "ok", ...bundle });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.get");
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireDesigner();
    const body = await request.json().catch(() => null);

    const patch: TablesUpdate<"designer_profiles"> = {};
    if (typeof body?.studioName === "string" && body.studioName.trim()) patch.studio_name = body.studioName.trim();
    if (typeof body?.bio === "string") patch.bio = body.bio;
    if (typeof body?.story === "string") patch.story = body.story;
    if (typeof body?.contactEmail === "string") patch.contact_email = body.contactEmail;
    if (typeof body?.openingHours === "string") patch.opening_hours = body.openingHours;
    if (typeof body?.atelierLocation === "string") patch.atelier_location = body.atelierLocation;
    if (typeof body?.instagramUrl === "string") patch.instagram_url = body.instagramUrl;
    if (typeof body?.websiteUrl === "string") patch.website_url = body.websiteUrl;
    if (typeof body?.city === "string") patch.city = body.city;
    if (typeof body?.country === "string") patch.country = body.country;
    if (typeof body?.experienceYears === "number") patch.experience_years = body.experienceYears;
    if (typeof body?.startingPrice === "number") patch.starting_price = body.startingPrice;
    if (Array.isArray(body?.specializations)) patch.specializations = body.specializations;
    if (body && "bannerFileId" in body) {
      patch.banner_file_id = typeof body.bannerFileId === "string" ? body.bannerFileId : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ status: "error", message: "Nothing to update." }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.from("designer_profiles").update(patch).eq("id", ctx.designerId);
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.designer.studio.patch");
  }
}
