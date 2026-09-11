/**
 * Change password for an ALREADY-SIGNED-IN user (Settings > Security), distinct from
 * app/api/auth/set-password/route.ts — that route is for the signup/recovery flows, where there is
 * deliberately no "old" password to check. This one requires proving the caller actually knows the
 * CURRENT password before accepting a new one: without that, anyone with a left-open/hijacked
 * session (not just the account owner) could silently change the password and lock the real owner
 * out. Reauthentication is done via a normal supabase.auth.signInWithPassword() call — the same
 * primitive app/api/auth/login/route.ts already uses — not any custom verification logic.
 *
 * No custom password storage anywhere: Supabase Auth (auth.users) owns the credential entirely, via
 * the standard supabase.auth.updateUser({ password }) call.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/authorization";
import { validatePasswordConfirmation } from "@/lib/auth/password";
import { errorResponse } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireUser();

    const body = await request.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ status: "error", message: "Enter your current password." }, { status: 400 });
    }
    const validationError = validatePasswordConfirmation(newPassword, confirmPassword);
    if (validationError) {
      return NextResponse.json({ status: "error", message: validationError }, { status: 400 });
    }
    if (!ctx.user.email) {
      return NextResponse.json({ status: "error", message: "Your account has no email on file." }, { status: 400 });
    }

    const supabase = createClient();

    // Reauthenticate — this is what makes it a genuine "change" (proves current-password knowledge)
    // rather than an unconditional overwrite. On success this just refreshes the same session's
    // tokens (same user, same cookie) — it doesn't sign anyone out or switch identity. On failure it
    // returns an error without touching the existing session at all.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: ctx.user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return NextResponse.json({ status: "error", message: "Current password is incorrect." }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, "api.auth.change-password");
  }
}
