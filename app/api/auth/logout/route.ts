import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.auth.logout");
  }
}
