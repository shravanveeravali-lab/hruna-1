/**
 * The admin's own display name (Admin Settings' "Admin profile" section) — same
 * `public.users.display_name` field every other profile page in this app already uses. Email
 * stays read-only, sourced from the authenticated session (Supabase Auth owns it), matching every
 * other profile page's convention.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/authorization";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const supabase = createClient();
    const { data } = await supabase.from("users").select("display_name, email").eq("id", ctx.user.id).maybeSingle();
    return NextResponse.json({ status: "ok", displayName: data?.display_name ?? "", email: data?.email ?? "" });
  } catch (err) {
    return errorResponse(err, "api.admin.profile.get");
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json().catch(() => null);
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    if (!displayName) return NextResponse.json({ status: "error", message: "Enter a name." }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase.from("users").update({ display_name: displayName }).eq("id", ctx.user.id);
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.admin.profile.patch");
  }
}
